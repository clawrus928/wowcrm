"""Guarded host deployment. --check is read-only; --deploy requires approval.

Never provisions or migrates a database. Never replaces the host's .env.
All Docker operations target the local daemon, never an inherited context.
"""
import argparse
import fcntl
import http.client
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import tempfile
import time

APP = Path('/srv/apps/wowcrm')
DATA = Path('/srv/data/wowcrm')
DB = DATA / 'wowcrm.db'
COMPOSE = APP / 'docker-compose.yml'
ENV_FILE = APP / '.env'
IMAGE_PATTERN = r'ghcr\.io/clawrus928/wowcrm@sha256:[0-9a-f]{64}'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def docker(*args, image=None):
    env = os.environ.copy()
    for key in ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS',
                'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'):
        env.pop(key, None)
    if image:
        env['WOWCRM_IMAGE'] = image
    # Capture output: Compose errors/config may contain application secrets.
    result = subprocess.run(['docker', '--host=unix:///var/run/docker.sock', *args],
                            env=env, text=True, capture_output=True, timeout=180)
    require(result.returncode == 0, f'Docker {args[0]} failed; inspect securely on the host')
    return result.stdout


def compose(path, image, *args, override=None):
    files = ['-f', str(path)]
    if override:
        files += ['-f', str(override)]
    return docker('compose', '--project-name', 'wowcrm', '--project-directory', str(APP),
                  '--env-file', str(ENV_FILE), *files, *args, image=image)


def inspect_container():
    return json.loads(docker('inspect', 'wowcrm'))[0]


def verify_container(container, expected_image=None):
    require(container['State']['Running'], 'Existing wowcrm container must be running')
    labels = container['Config'].get('Labels') or {}
    require(labels.get('com.docker.compose.project') == 'wowcrm' and
            labels.get('com.docker.compose.service') == 'app',
            'Unexpected Compose project/service; manual adoption is required')
    require(labels.get('com.docker.compose.project.working_dir') == str(APP),
            'Unexpected Compose working directory; audit it before adopting this deployment')
    mounts = [m for m in container['Mounts'] if m['Destination'] == '/data']
    require(len(mounts) == 1 and mounts[0]['Type'] == 'bind' and mounts[0]['RW'] and
            Path(mounts[0]['Source']).resolve() == DATA.resolve(),
            'Running /data is not backed by /srv/data/wowcrm; refusing to switch databases')
    env = dict(v.split('=', 1) for v in container['Config']['Env'] if '=' in v)
    require(env.get('DB_PATH') == '/data/wowcrm.db', 'Unexpected running DB_PATH')
    ports = container['HostConfig'].get('PortBindings') or {}
    require(ports.get('8080/tcp') == [{'HostIp': '127.0.0.1', 'HostPort': '8002'}],
            'Unexpected running port binding')
    if expected_image:
        require(container['Image'] == expected_image, 'Running image does not match release')
    return env


def preflight(image, revision):
    require(re.fullmatch(IMAGE_PATTERN, image), 'An immutable WOW CRM image digest is required')
    require(re.fullmatch(r'[0-9a-f]{40}', revision), 'A full commit SHA is required')
    for directory in (APP, DATA):
        require(directory.is_dir(), f'Required existing directory missing: {directory}')
    for path in (DB, COMPOSE, ENV_FILE):
        require(path.is_file() and path.stat().st_size > 0, f'Required existing file missing: {path}')
    require(DB.resolve().parent == DATA.resolve(), 'Database resolves outside the approved data directory')
    require(ENV_FILE.stat().st_mode & 0o077 == 0, 'Host .env must not be group/world accessible')
    current = inspect_container()
    verify_container(current)
    return current


def validate_candidate(path, image, current):
    config = json.loads(compose(path, image, 'config', '--format', 'json'))
    require(set(config['services']) == {'app'}, 'Unexpected services in release Compose')
    app = config['services']['app']
    require(app['image'] == image and app['container_name'] == 'wowcrm', 'Unexpected release image/name')
    # Compose's JSON renderer omits a false create_host_path boolean.
    volumes = app.get('volumes', [])
    require(len(volumes) == 1 and volumes[0]['type'] == 'bind' and
            volumes[0]['source'] == str(DATA) and volumes[0]['target'] == '/data' and
            volumes[0].get('bind', {}).get('create_host_path', False) is False,
            'Release must bind the existing data directory without creating it')
    ports = app.get('ports', [])
    require(len(ports) == 1 and ports[0].get('host_ip') == '127.0.0.1' and
            str(ports[0].get('published')) == '8002' and ports[0].get('target') == 8080,
            'Unexpected release port binding')
    env = app['environment']
    require(env.get('DB_PATH') == '/data/wowcrm.db' and env.get('NODE_ENV') == 'production',
            'Release must use the approved production DB_PATH')
    old_env = verify_container(current)
    for key in ('JWT_SECRET', 'DEFAULT_PASSWORD', 'API_KEY'):
        require(env.get(key) and env[key] == old_env.get(key),
                f'{key} missing or differs from running container; rotate separately')
    require(env['JWT_SECRET'] != 'dev-secret-change-me', 'Development JWT secret is not allowed')
    require(env['DEFAULT_PASSWORD'] != 'wowcrm', 'Development default password is not allowed')


def backup_database(revision):
    directory = DATA / 'backups'
    directory.mkdir(mode=0o700, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=f'before-{revision[:12]}-', suffix='.sqlite3', dir=directory)
    os.close(fd)
    started = time.monotonic()

    def progress(*_):
        require(time.monotonic() - started < 60, 'SQLite backup timed out; no deployment attempted')

    source = sqlite3.connect(DB.as_uri() + '?mode=ro', uri=True, timeout=5)
    destination = sqlite3.connect(name)
    try:
        source.backup(destination, pages=256, progress=progress, sleep=0.1)
    finally:
        destination.close()
        source.close()
    snapshot = sqlite3.connect(Path(name).as_uri() + '?mode=ro', uri=True)
    try:
        require(snapshot.execute('PRAGMA quick_check').fetchone() == ('ok',), 'Backup integrity check failed')
        tables = {row[0] for row in snapshot.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        require({'users', 'records', 'audit'} <= tables, 'Backup does not have the expected CRM schema')
        require(snapshot.execute('SELECT count(*) FROM users').fetchone()[0] > 0, 'Backup has no users')
    finally:
        snapshot.close()
    return Path(name)


def atomic_write(path, data):
    fd, name = tempfile.mkstemp(prefix='.wowcrm-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as out:
            out.write(data)
            out.flush()
            os.fsync(out.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def db_identity():
    stat = DB.stat()
    return stat.st_dev, stat.st_ino


def wait_healthy(image_id, identity):
    for _ in range(20):
        try:
            connection = http.client.HTTPConnection('127.0.0.1', 8002, timeout=3)
            try:
                connection.request('GET', '/api/health')
                response = connection.getresponse()
                ok = response.status == 200 and json.loads(response.read()).get('ok') is True
            finally:
                connection.close()
            if ok:
                verify_container(inspect_container(), image_id)
                require(db_identity() == identity, 'Database file identity changed during deployment')
                return
        except (OSError, ValueError, RuntimeError, http.client.HTTPException):
            pass
        time.sleep(2)
    raise RuntimeError('Release did not pass image, mount, database identity and HTTP verification')


def deploy(image, revision):
    # preflight before even creating the lock; repeat under lock to avoid races.
    preflight(image, revision)
    with (APP / '.deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        current = preflight(image, revision)
        release = APP / 'releases' / revision
        candidate = release / 'docker-compose.yml'
        validate_candidate(candidate, image, current)
        old_config = COMPOSE.read_bytes()
        identity = db_identity()
        docker('pull', image)
        image_info = json.loads(docker('image', 'inspect', image))[0]
        require((image_info['Config'].get('Labels') or {}).get('org.opencontainers.image.revision') == revision,
                'Image revision does not match the approved commit')
        snapshot = backup_database(revision)
        print(f'Consistent SQLite backup verified: {snapshot}', flush=True)
        # Keep the original Compose file for recovery; never copy or replace .env.
        atomic_write(snapshot.with_suffix('.compose.yml'), old_config)
        rollback_override = snapshot.with_suffix('.image.json')
        atomic_write(rollback_override, json.dumps({'services': {'app': {'image': current['Image']}}}).encode())
        compose(COMPOSE, current['Image'], 'config', '--quiet', override=rollback_override)
        require(db_identity() == identity, 'Database changed before container replacement')
        try:
            atomic_write(COMPOSE, candidate.read_bytes())
            compose(COMPOSE, image, 'up', '-d', '--no-deps', '--pull', 'never', 'app')
            wait_healthy(image_info['Id'], identity)
        except Exception:
            atomic_write(COMPOSE, old_config)
            compose(COMPOSE, current['Image'], 'up', '-d', '--no-deps', '--pull', 'never', 'app', override=rollback_override)
            wait_healthy(current['Image'], identity)
            raise RuntimeError('Deployment failed; previous image/config restored. Database was not restored.') from None
        print(f'Deployed and verified {revision} ({image})', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--deploy', action='store_true')
    parser.add_argument('image')
    parser.add_argument('revision')
    args = parser.parse_args()
    os.umask(0o077)
    try:
        if args.check:
            preflight(args.image, args.revision)
            print('Read-only preflight passed; existing mount and container match the approved layout')
        else:
            deploy(args.image, args.revision)
    except Exception as error:
        # Do not print raw subprocess output or container environment values.
        parser.exit(1, f'{type(error).__name__}: {error}\n')


if __name__ == '__main__':
    main()
