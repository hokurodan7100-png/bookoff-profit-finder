import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Repository } from './repository.ts';
import type { Role } from '../shared/constants.ts';

/**
 * 認証の方式（優先順）
 * 1. users 表に1人以上いる → ユーザー別のBasic認証（accounts）
 * 2. APP_PASSWORD がある → 共有パスワード（password、ユーザー名は任意、管理者扱い）
 * 3. どちらも無い → 認証なし（none、管理者扱い。同じWi-Fi内での利用を想定）
 */

// ---------- パスワードのハッシュ（scrypt、ソルト付き） ----------
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, n, r, p, salt, key] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const got = scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return timingSafeEqual(got, expected);
}

/** 共有パスワード（APP_PASSWORD）の比較。長さに依存しないようハッシュ同士を定数時間で比べる */
export function checkPassword(header: string | undefined, password: string): boolean {
  const cred = parseBasic(header);
  if (!cred) return false;
  const h = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(h(cred.password), h(password));
}

export function parseBasic(header: string | undefined): { username: string; password: string } | null {
  if (!header?.startsWith('Basic ')) return null;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const i = decoded.indexOf(':');
  if (i < 0) return null;
  return { username: decoded.slice(0, i), password: decoded.slice(i + 1) };
}

// ---------- 権限 ----------
/** 誰でも（viewer でも）使えるのは読み取りだけ。書き込みは editor 以上、ユーザー・設定・店舗マスタ・デモは admin */
export function requiredRole(method: string, path: string): Role {
  if (path === '/api/me') return 'viewer';
  if (path.startsWith('/api/users')) return 'admin';
  if (method === 'GET' || method === 'HEAD') return 'viewer';
  if (path === '/api/settings' || path === '/api/demo' || path === '/api/import/stores') return 'admin';
  return 'editor';
}

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };
export const hasRole = (role: Role, need: Role) => RANK[role] >= RANK[need];

// ---------- 認証 ----------
export interface Principal { username: string | null; role: Role; userId: number | null }
export type AuthResult = { ok: true; principal: Principal } | { ok: false; status: 401 | 429; message: string };

const MAX_FAILS = 10;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const CACHE_MS = 10 * 60 * 1000;

export class Authenticator {
  /** 認証済みヘッダの短期キャッシュ（毎リクエストのscryptを避ける）。キーはヘッダのSHA-256で、平文は持たない */
  private cache = new Map<string, { userId: number; expires: number }>();
  private fails = new Map<string, { count: number; since: number }>();

  constructor(private repo: Repository, private sharedPassword?: string) {}

  mode(): 'accounts' | 'password' | 'none' {
    if (this.repo.countUsers() > 0) return 'accounts';
    return this.sharedPassword ? 'password' : 'none';
  }

  /** ユーザーの追加・変更・削除のあとに呼ぶ */
  invalidate() { this.cache.clear(); }

  authenticate(header: string | undefined, clientKey: string, now = Date.now()): AuthResult {
    const mode = this.mode();
    if (mode === 'none') return { ok: true, principal: { username: null, role: 'admin', userId: null } };
    const f = this.fails.get(clientKey);
    if (f && now - f.since < FAIL_WINDOW_MS && f.count >= MAX_FAILS) {
      return { ok: false, status: 429, message: 'パスワードの間違いが続いたため、15分ほど待ってからやり直してください' };
    }
    if (mode === 'password') {
      if (checkPassword(header, this.sharedPassword!)) { this.fails.delete(clientKey); return { ok: true, principal: { username: null, role: 'admin', userId: null } }; }
      return this.fail(clientKey, header, now);
    }
    const key = header ? createHash('sha256').update(header).digest('base64') : '';
    const hit = key ? this.cache.get(key) : undefined;
    if (hit && hit.expires > now) {
      const u = this.repo.getUser(hit.userId);
      if (u) return { ok: true, principal: { username: u.username, role: u.role, userId: u.id } };
    }
    const cred = parseBasic(header);
    const found = cred ? this.repo.findUserForLogin(cred.username.trim()) : null;
    // ユーザーが居ないときもハッシュ計算をして、応答時間でユーザー名の有無が分からないようにする
    const ok = cred ? verifyPassword(cred.password, found?.passwordHash ?? DUMMY_HASH) && !!found : false;
    if (!ok || !found) return this.fail(clientKey, header, now);
    this.fails.delete(clientKey);
    this.cache.set(key, { userId: found.user.id, expires: now + CACHE_MS });
    this.repo.touchLogin(found.user.id);
    return { ok: true, principal: { username: found.user.username, role: found.user.role, userId: found.user.id } };
  }

  private fail(clientKey: string, header: string | undefined, now: number): AuthResult {
    // ヘッダ無し（最初のアクセス）は失敗に数えない
    if (header) {
      const f = this.fails.get(clientKey);
      if (!f || now - f.since >= FAIL_WINDOW_MS) this.fails.set(clientKey, { count: 1, since: now });
      else f.count++;
    }
    return { ok: false, status: 401, message: this.mode() === 'accounts' ? 'ユーザー名とパスワードが必要です' : 'パスワードが必要です' };
  }
}

const DUMMY_HASH = hashPassword(randomBytes(12).toString('hex'));

