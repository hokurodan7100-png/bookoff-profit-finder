import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../../src/server/db.ts';
import { Repository } from '../../src/server/repository.ts';
import { Authenticator, hashPassword, requiredRole, verifyPassword } from '../../src/server/auth.ts';
import { startServer } from '../../src/server/main.ts';

const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;

describe('パスワードのハッシュ', () => {
  it('scryptでソルト付き保存し、照合できる', () => {
    const h = hashPassword('ふじさん2026');
    assert.match(h, /^scrypt\$/);
    assert.ok(!h.includes('ふじさん2026'));
    assert.notEqual(h, hashPassword('ふじさん2026'), 'ソルトで毎回変わる');
    assert.ok(verifyPassword('ふじさん2026', h));
    assert.ok(!verifyPassword('ふじさん2027', h));
    assert.ok(!verifyPassword('x', 'plain-text'));
  });
});

describe('権限の判定', () => {
  it('読み取りは閲覧者、書き込みは編集者、設定・ユーザー・店舗CSV・デモは管理者', () => {
    assert.equal(requiredRole('GET', '/api/items'), 'viewer');
    assert.equal(requiredRole('GET', '/api/export.csv'), 'viewer');
    assert.equal(requiredRole('POST', '/api/products'), 'editor');
    assert.equal(requiredRole('POST', '/api/import/market'), 'editor');
    assert.equal(requiredRole('PUT', '/api/settings'), 'admin');
    assert.equal(requiredRole('POST', '/api/import/stores'), 'admin');
    assert.equal(requiredRole('DELETE', '/api/demo'), 'admin');
    assert.equal(requiredRole('GET', '/api/users'), 'admin');
    assert.equal(requiredRole('GET', '/api/me'), 'viewer');
  });
});

describe('Authenticator', () => {
  it('ユーザー無し＋共有パスワード無しは認証なし、共有パスワードあり、ユーザーありで切り替わる', () => {
    const repo = new Repository(openDb(':memory:'));
    assert.equal(new Authenticator(repo).mode(), 'none');
    const a = new Authenticator(repo, 'shared');
    assert.equal(a.mode(), 'password');
    assert.ok(a.authenticate(basic('誰でも', 'shared'), 'ip').ok);
    repo.insertUser({ username: 'taro', passwordHash: hashPassword('password1'), role: 'editor' });
    assert.equal(a.mode(), 'accounts');
    assert.equal(a.authenticate(basic('誰でも', 'shared'), 'ip').ok, false, 'ユーザーを作ると共有パスワードは使えない');
    const r = a.authenticate(basic('taro', 'password1'), 'ip');
    assert.ok(r.ok && r.principal.role === 'editor' && r.principal.username === 'taro');
    assert.ok(repo.getUser(1)!.lastLoginAt);
  });
  it('間違いが10回続くと15分ロックし、他の端末は影響を受けない', () => {
    const repo = new Repository(openDb(':memory:'));
    repo.insertUser({ username: 'hana', passwordHash: hashPassword('password1'), role: 'admin' });
    const a = new Authenticator(repo);
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) assert.equal((a.authenticate(basic('hana', 'bad'), 'A', t0) as { status: number }).status, 401);
    const locked = a.authenticate(basic('hana', 'password1'), 'A', t0 + 1000);
    assert.equal(locked.ok, false);
    assert.equal((locked as { status: number }).status, 429);
    assert.ok(a.authenticate(basic('hana', 'password1'), 'B', t0 + 1000).ok);
    assert.ok(a.authenticate(basic('hana', 'password1'), 'A', t0 + 16 * 60 * 1000).ok, '15分後は解除');
  });
  it('権限変更はキャッシュを消すと即時反映', () => {
    const repo = new Repository(openDb(':memory:'));
    const u = repo.insertUser({ username: 'jiro', passwordHash: hashPassword('password1'), role: 'admin' });
    const a = new Authenticator(repo);
    assert.ok(a.authenticate(basic('jiro', 'password1'), 'ip').ok);
    repo.updateUser(u.id, { passwordHash: hashPassword('password2') });
    a.invalidate();
    assert.equal(a.authenticate(basic('jiro', 'password1'), 'ip').ok, false);
    assert.ok(a.authenticate(basic('jiro', 'password2'), 'ip').ok);
  });
});

describe('ユーザーAPI', () => {
  it('最初の管理者を作るとログインが必要になり、権限ごとに操作が制限される', async () => {
    const { server, url } = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', demo: false, quiet: true, publicDir: 'public' });
    const call = async (method: string, path: string, auth?: string, body?: unknown) => {
      const headers: Record<string, string> = {};
      if (auth) headers.authorization = auth;
      if (body) headers['content-type'] = 'application/json';
      const r = await fetch(url + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      return { status: r.status, body: await r.json().catch(() => null) };
    };
    try {
      assert.equal((await call('GET', '/api/me')).body.authMode, 'none');
      assert.equal((await call('POST', '/api/users', undefined, { username: 'a', password: 'password1', role: 'viewer' })).status, 400, '最初は管理者');
      assert.equal((await call('POST', '/api/users', undefined, { username: 'a', password: 'short', role: 'admin' })).status, 400, '8文字以上');
      const created = await call('POST', '/api/users', undefined, { username: 'boss', password: 'password1', role: 'admin' });
      assert.equal(created.status, 201);
      assert.equal(created.body.passwordHash, undefined);
      assert.equal(JSON.stringify(created.body).includes('scrypt'), false, 'ハッシュを返さない');
      assert.equal((await call('GET', '/api/meta')).status, 401);
      const admin = basic('boss', 'password1');
      const me = await call('GET', '/api/me', admin);
      assert.deepEqual(me.body, { username: 'boss', role: 'admin', authMode: 'accounts', https: false });
      assert.equal((await call('POST', '/api/users', admin, { username: 'boss', password: 'password1', role: 'viewer' })).status, 409);
      await call('POST', '/api/users', admin, { username: 'mi', password: 'password1', role: 'viewer' });
      const ed = await call('POST', '/api/users', admin, { username: 'ed', password: 'password1', role: 'editor' });
      const viewer = basic('mi', 'password1'), editor = basic('ed', 'password1');
      assert.equal((await call('GET', '/api/items', viewer)).status, 200);
      const denied = await call('POST', '/api/products', viewer, { name: 'x', category: '本' });
      assert.equal(denied.status, 403);
      assert.match(denied.body.error, /編集者/);
      assert.equal((await call('POST', '/api/products', editor, { name: 'x', category: '本' })).status, 201);
      assert.equal((await call('GET', '/api/settings', editor)).status, 200);
      const settings = (await call('GET', '/api/settings', editor)).body;
      assert.equal((await call('PUT', '/api/settings', editor, settings)).status, 403);
      assert.equal((await call('PUT', '/api/settings', admin, settings)).status, 200);
      assert.equal((await call('GET', '/api/users', editor)).status, 403);
      // 最後の管理者は降格・削除できない
      const users = (await call('GET', '/api/users', admin)).body.users as { id: number; username: string }[];
      const bossId = users.find((u) => u.username === 'boss')!.id;
      assert.equal((await call('PUT', `/api/users/${bossId}`, admin, { role: 'editor' })).status, 400);
      assert.equal((await call('DELETE', `/api/users/${bossId}`, admin)).status, 400);
      // 編集者を管理者にすると、元の管理者を削除できる
      assert.equal((await call('PUT', `/api/users/${ed.body.id}`, admin, { role: 'admin' })).status, 200);
      assert.equal((await call('PUT', '/api/settings', editor, settings)).status, 200, '昇格が即時反映');
      assert.equal((await call('DELETE', `/api/users/${bossId}`, editor)).status, 200);
      assert.equal((await call('GET', '/api/me', admin)).status, 401, '削除されたユーザーは入れない');
    } finally { server.close(); }
  });

  it('TLS証明書を渡すとHTTPSで待ち受け、HSTSを付ける', async (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'bpf-tls-'));
    try {
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
        '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem')], { stdio: 'ignore' });
    } catch { t.skip('openssl が無い環境'); return; }
    const tls = { cert: readFileSync(join(dir, 'cert.pem'), 'utf8'), key: readFileSync(join(dir, 'key.pem'), 'utf8') };
    const { server, url } = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', demo: false, quiet: true, publicDir: 'public', tls });
    try {
      assert.match(url, /^https:/);
      const { request } = await import('node:https');
      const res = await new Promise<{ status: number; hsts: string | undefined; body: string }>((ok, ng) => {
        request(`${url}/api/me`, { ca: tls.cert }, (r) => {
          let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => ok({ status: r.statusCode!, hsts: r.headers['strict-transport-security'] as string, body: b }));
        }).on('error', ng).end();
      });
      assert.equal(res.status, 200);
      assert.match(res.hsts ?? '', /max-age=/);
      assert.equal(JSON.parse(res.body).https, true);
    } finally { server.close(); }
  });
});
