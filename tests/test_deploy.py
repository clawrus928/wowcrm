import copy
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('deploy', Path(__file__).resolve().parents[1] / 'scripts/deploy.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)
IMAGE = 'ghcr.io/clawrus928/wowcrm@sha256:' + 'a' * 64
REVISION = 'b' * 40


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='wowcrm-deploy-test-')
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        app, data = root / 'app', root / 'data'
        app.mkdir()
        data.mkdir()
        for key, value in {'APP': app, 'DATA': data, 'DB': data / 'wowcrm.db',
                           'COMPOSE': app / 'docker-compose.yml', 'ENV_FILE': app / '.env'}.items():
            override = patch.object(deploy, key, value)
            override.start()
            self.addCleanup(override.stop)
        deploy.DB.write_bytes(b'existing-database')
        deploy.COMPOSE.write_bytes(b'original-compose')
        deploy.ENV_FILE.write_text('not-a-real-production-secret')
        deploy.ENV_FILE.chmod(0o600)
        self.container = {
            'State': {'Running': True}, 'Image': 'sha256:' + 'c' * 64,
            'Config': {'Labels': {'com.docker.compose.project': 'wowcrm',
                                 'com.docker.compose.service': 'app',
                                 'com.docker.compose.project.working_dir': str(app)},
                       'Env': ['DB_PATH=/data/wowcrm.db', 'JWT_SECRET=test-jwt',
                               'DEFAULT_PASSWORD=test-password', 'API_KEY=test-key']},
            'Mounts': [{'Type': 'bind', 'Destination': '/data', 'Source': str(data), 'RW': True}],
            'HostConfig': {'PortBindings': {'8080/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '8002'}]}}
        }
        self.config = {'services': {'app': {
            'image': IMAGE, 'container_name': 'wowcrm',
            'volumes': [{'type': 'bind', 'source': str(data), 'target': '/data',
                         'bind': {'create_host_path': False}}],
            'ports': [{'host_ip': '127.0.0.1', 'published': '8002', 'target': 8080}],
            'environment': {'NODE_ENV': 'production', 'DB_PATH': '/data/wowcrm.db',
                            'JWT_SECRET': 'test-jwt', 'DEFAULT_PASSWORD': 'test-password', 'API_KEY': 'test-key'}
        }}}

    def preflight(self):
        with patch.object(deploy, 'inspect_container', return_value=self.container):
            return deploy.preflight(IMAGE, REVISION)

    def test_readonly_preflight_does_not_change_files(self):
        before = {p: p.read_bytes() for p in Path(self.temp.name).rglob('*') if p.is_file()}
        self.preflight()
        self.assertEqual(before, {p: p.read_bytes() for p in Path(self.temp.name).rglob('*') if p.is_file()})
        self.assertFalse((deploy.APP / '.deploy.lock').exists())

    def test_missing_database_is_not_created(self):
        deploy.DB.unlink()
        with self.assertRaisesRegex(RuntimeError, 'Required existing file missing'):
            self.preflight()
        self.assertFalse(deploy.DB.exists())

    def test_old_mount_is_rejected(self):
        self.container['Mounts'][0]['Source'] = '/var/lib/wowcrm'
        with self.assertRaisesRegex(RuntimeError, 'refusing to switch databases'):
            self.preflight()

    def test_named_volume_is_rejected(self):
        self.container['Mounts'][0]['Type'] = 'volume'
        with self.assertRaises(RuntimeError):
            self.preflight()

    def test_other_project_and_working_directory_are_rejected(self):
        for field, value in [('com.docker.compose.project', 'another-app'),
                             ('com.docker.compose.project.working_dir', '/opt/wowcrm')]:
            container = copy.deepcopy(self.container)
            container['Config']['Labels'][field] = value
            with self.subTest(field=field), self.assertRaises(RuntimeError):
                deploy.verify_container(container)

    def test_db_path_and_public_port_are_rejected(self):
        container = copy.deepcopy(self.container)
        container['Config']['Env'][0] = 'DB_PATH=/data/other.db'
        with self.assertRaisesRegex(RuntimeError, 'DB_PATH'):
            deploy.verify_container(container)
        self.container['HostConfig']['PortBindings']['8080/tcp'][0]['HostIp'] = '0.0.0.0'
        with self.assertRaisesRegex(RuntimeError, 'port binding'):
            self.preflight()

    def test_latest_or_shell_content_cannot_be_used_as_image(self):
        for image in ['ghcr.io/clawrus928/wowcrm:latest', IMAGE + '; touch /tmp/no']:
            with self.subTest(image=image), self.assertRaisesRegex(RuntimeError, 'immutable'):
                deploy.preflight(image, REVISION)

    def test_candidate_cannot_change_credentials_or_create_data_path(self):
        with patch.object(deploy, 'compose', side_effect=lambda *a, **k: json.dumps(self.config)):
            deploy.validate_candidate(deploy.COMPOSE, IMAGE, self.container)
            self.config['services']['app']['environment']['JWT_SECRET'] = 'rotated-unexpectedly'
            with self.assertRaisesRegex(RuntimeError, 'JWT_SECRET'):
                deploy.validate_candidate(deploy.COMPOSE, IMAGE, self.container)
            self.config['services']['app']['environment']['JWT_SECRET'] = 'test-jwt'
            self.config['services']['app']['volumes'][0]['bind']['create_host_path'] = True
            with self.assertRaisesRegex(RuntimeError, 'without creating'):
                deploy.validate_candidate(deploy.COMPOSE, IMAGE, self.container)

    def test_compose_normalizes_false_create_host_path_by_omitting_it(self):
        self.config['services']['app']['volumes'][0]['bind'].pop('create_host_path')
        with patch.object(deploy, 'compose', return_value=json.dumps(self.config)):
            deploy.validate_candidate(deploy.COMPOSE, IMAGE, self.container)

    def test_wal_backup_contains_committed_rows_and_opens_readonly(self):
        deploy.DB.unlink()
        source = sqlite3.connect(deploy.DB)
        self.addCleanup(source.close)
        source.execute('PRAGMA journal_mode=WAL')
        source.executescript('CREATE TABLE users(id); CREATE TABLE records(id); CREATE TABLE audit(id);')
        source.execute('INSERT INTO users VALUES (1)')
        source.execute('INSERT INTO records VALUES (42)')
        source.commit()
        snapshot = deploy.backup_database(REVISION)
        restored = sqlite3.connect(snapshot.as_uri() + '?mode=ro', uri=True)
        self.addCleanup(restored.close)
        self.assertEqual(restored.execute('SELECT id FROM records').fetchall(), [(42,)])
        self.assertEqual(snapshot.stat().st_mode & 0o777, 0o600)
        self.assertEqual(source.execute('SELECT id FROM records').fetchall(), [(42,)])

    def test_docker_errors_do_not_print_credentials_and_ignore_remote_context(self):
        result = subprocess.CompletedProcess([], 1, 'JWT_SECRET=do-not-print', 'API_KEY=do-not-print')
        with patch.dict(os.environ, {'DOCKER_HOST': 'tcp://example.invalid', 'DOCKER_CONTEXT': 'production'}):
            with patch.object(subprocess, 'run', return_value=result) as run:
                with self.assertRaisesRegex(RuntimeError, '^Docker compose failed; inspect securely on the host$'):
                    deploy.docker('compose', 'config')
                self.assertNotIn('DOCKER_CONTEXT', run.call_args.kwargs['env'])
                self.assertEqual(run.call_args.args[0][1], '--host=unix:///var/run/docker.sock')

    def exercise_deploy(self, health_error=False, backup_error=False):
        release = deploy.APP / 'releases' / REVISION
        release.mkdir(parents=True)
        (release / 'docker-compose.yml').write_bytes(b'new-compose')
        backup = deploy.DATA / 'snapshot.sqlite3'
        backup.write_bytes(b'snapshot')
        image_info = {'Id': 'sha256:' + 'd' * 64, 'Config': {'Labels': {'org.opencontainers.image.revision': REVISION}}}
        with patch.object(deploy, 'preflight', return_value=self.container), \
             patch.object(deploy, 'validate_candidate'), \
             patch.object(deploy, 'docker', return_value=json.dumps([image_info])), \
             patch.object(deploy, 'backup_database', side_effect=RuntimeError('backup failed') if backup_error else None, return_value=backup), \
             patch.object(deploy, 'compose') as compose, \
             patch.object(deploy, 'wait_healthy', side_effect=[RuntimeError('bad release'), None] if health_error else None):
            if health_error or backup_error:
                with self.assertRaises(RuntimeError):
                    deploy.deploy(IMAGE, REVISION)
            else:
                deploy.deploy(IMAGE, REVISION)
            return compose.call_args_list

    def test_failed_release_restores_previous_config_and_exact_image_not_database(self):
        before = deploy.DB.read_bytes()
        calls = self.exercise_deploy(health_error=True)
        self.assertEqual(deploy.COMPOSE.read_bytes(), b'original-compose')
        self.assertEqual(deploy.DB.read_bytes(), before)
        override = calls[-1].kwargs['override']
        self.assertEqual(json.loads(override.read_text())['services']['app']['image'], self.container['Image'])
        self.assertIn('never', calls[-1].args)

    def test_backup_failure_never_replaces_or_starts_container(self):
        self.assertEqual(self.exercise_deploy(backup_error=True), [])
        self.assertEqual(deploy.COMPOSE.read_bytes(), b'original-compose')

    def test_success_replaces_compose_and_preserves_host_env(self):
        before = deploy.ENV_FILE.read_bytes()
        self.exercise_deploy()
        self.assertEqual(deploy.COMPOSE.read_bytes(), b'new-compose')
        self.assertEqual(deploy.ENV_FILE.read_bytes(), before)

    def test_ssh_entry_rejects_wrong_host_and_branch_before_connecting(self):
        script = Path(__file__).resolve().parents[1] / 'scripts/ssh-deploy.sh'
        for host, ref, message in [
            ('192.0.2.1', 'refs/heads/master', 'EC2_HOST does not match the approved host'),
            ('43.160.242.177', 'refs/heads/feature', 'Deploy requires master'),
        ]:
            with self.subTest(host=host, ref=ref):
                result = subprocess.run(['bash', str(script)], capture_output=True, text=True,
                                        env={**os.environ, 'EC2_HOST': host, 'GITHUB_REF': ref}, timeout=5)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, '')
                self.assertIn(message, result.stderr)
                self.assertNotIn(host, result.stderr)


if __name__ == '__main__':
    unittest.main()
