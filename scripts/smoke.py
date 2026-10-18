"""Run the repository's documented curl smoke checks using an isolated /tmp DB."""
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which('node')
assert NODE, 'Node 20 is required'
passed = 0

def check(condition, label):
    global passed
    if not condition:
        raise AssertionError(label)
    passed += 1
    print(f'PASS {label}', flush=True)

with tempfile.TemporaryDirectory(prefix='wowcrm-smoke-', dir='/tmp') as temp:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    api_key, password = secrets.token_hex(16), secrets.token_hex(16)
    env = dict(os.environ, NODE_ENV='test', HOST='127.0.0.1', PORT=str(port),
               DB_PATH=f'{temp}/smoke.db', STATIC_DIR=str(ROOT / 'dist'),
               JWT_SECRET=secrets.token_hex(32), DEFAULT_PASSWORD=password, API_KEY=api_key)

    def request(path, method='GET', body=None, auth=None, expect=200, raw=False):
        assert path.startswith('/') and not path.startswith('//')
        args = ['curl', '--silent', '--show-error', '--max-time', '3',
                '--noproxy', '127.0.0.1', '--write-out', '\n%{http_code}',
                '--request', method, base + path]
        if auth == 'key':
            args += ['--header', f'X-API-Key: {api_key}']
        elif auth:
            args += ['--header', f'Authorization: Bearer {auth}']
        if body is not None:
            args += ['--header', 'Content-Type: application/json', '--data-binary', json.dumps(body)]
        response = subprocess.run(args, check=True, capture_output=True, text=True).stdout
        payload, status = response.rsplit('\n', 1)
        assert int(status) == expect, f'{method} {path}: expected {expect}, got {status}'
        return payload if raw else json.loads(payload)

    with (Path(temp) / 'server.log').open('w') as log:
        proc = subprocess.Popen([NODE, 'server/src/index.js'], cwd=ROOT, env=env,
                                stdout=log, stderr=subprocess.STDOUT)
        try:
            for attempt in range(50):
                if proc.poll() is not None:
                    raise RuntimeError(f'Local server exited with {proc.returncode}; check backend startup configuration')
                try:
                    health = request('/api/health')
                    break
                except subprocess.CalledProcessError:
                    time.sleep(0.1)
            else:
                raise RuntimeError('Local server did not become healthy')
            check(health.get('ok') is True, 'GET /api/health returns ok=true')
            check('<div id="root"></div>' in request('/', raw=True), 'Built frontend served by local backend')
            users = request('/api/auth/users')
            check(len(users) == 11 and all('password_hash' not in u for u in users), '11 seeded development users; no hashes returned')
            check(request('/api/customers', expect=401).get('error') == 'Unauthorized', 'Unauthenticated access rejected')
            login = request('/api/auth/login', 'POST', {'userId': 'u1', 'password': password})
            token = login['token']
            check(request('/api/auth/me', auth=token)['id'] == 'u1', 'Development login and JWT authentication')
            entities = ['leads', 'customers', 'contacts', 'deals', 'contracts', 'quotes',
                        'channels', 'suppliers', 'pricings', 'activities']
            check(all(request(f'/api/{entity}', auth='key') == [] for entity in entities), 'API-key reads for all 10 entities on a fresh DB')
            customer = request('/api/customers', 'POST', {'name': '本機測試客戶'}, auth=token)
            customer_path = '/api/customers/' + customer['id']
            check(customer['owner'] == 'u1' and request(customer_path, auth=token)['name'] == '本機測試客戶', 'Customer POST and GET round trip')
            check(request(customer_path, 'PATCH', {'name': '本機測試客戶已更新'}, auth=token)['name'] == '本機測試客戶已更新', 'Customer PATCH persisted')
            second_token = request('/api/auth/login', 'POST', {'userId': 'u2', 'password': password})['token']
            check('error' in request(customer_path, 'PATCH', {'name': 'Should not change'}, auth=second_token, expect=403), 'Non-owner update rejected')
            check('error' in request('/api/customers', 'POST', {}, auth='key', expect=400), 'Missing required name rejected')
            quote = request('/api/quotes', 'POST', {'title': '本機測試報價', 'customerId': customer['id'], 'currency': 'MOP'}, auth='key')
            check(quote['docNo'].startswith('Q-') and request('/api/quotes/' + quote['id'], auth='key')['docNo'] == quote['docNo'], 'Quote document number assigned and persisted')
            bulk = request('/api/leads/bulk', 'POST', {'items': [{'name': '本機線索一'}, {'name': '本機線索二'}]}, auth='key')
            check(bulk['count'] == 2 and len(request('/api/leads', auth='key')) == 2, 'Bulk POST and GET round trip')
            request('/api/leads/bulk', 'POST', {'items': [{'id': 'local-rollback', 'name': '回滾測試'}, {'id': bulk['created'][0]['id'], 'name': '重複測試'}]}, auth='key', expect=400)
            check(len(request('/api/leads', auth='key')) == 2 and 'error' in request('/api/leads/local-rollback', auth='key', expect=404), 'Duplicate ID rolls back the whole bulk transaction')
            check(request(customer_path, 'DELETE', auth=token)['ok'] is True and 'error' in request(customer_path, auth=token, expect=404), 'Customer DELETE followed by GET 404')
            audit = request('/api/_audit?entity=customers&recordId=' + customer['id'], auth='key')
            check({r['action'] for r in audit} == {'create', 'update', 'delete'}, 'Create/update/delete audit entries recorded')
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=5)
            print('Local backend process stopped', flush=True)
print(f'{passed} smoke checks passed; temporary SQLite database removed', flush=True)
