import { createServer, type Server } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { openDb } from './db.ts';
import { Repository } from './repository.ts';
import { createHandler } from './api.ts';
import { ensureSettings, seedDemo, seedStores } from './seed.ts';
import { createProviders } from './providers/registry.ts';
import type { AnyProvider } from './providers/types.ts';

export interface StartOptions { port?: number; host?: string; dbPath?: string; publicDir?: string; demo?: boolean; quiet?: boolean; providers?: AnyProvider[]; password?: string; tls?: { cert: string; key: string } }

export function startServer(opts: StartOptions = {}): Promise<{ server: Server; repo: Repository; url: string }> {
  const dbPath = opts.dbPath ?? process.env.DB_PATH ?? resolve('data/app.db');
  const publicDir = opts.publicDir ?? process.env.PUBLIC_DIR ?? resolve('dist/public');
  const repo = new Repository(openDb(dbPath));
  ensureSettings(repo);
  const added = seedStores(repo);
  const demo = opts.demo ?? process.env.SEED_DEMO !== '0';
  const isFresh = repo.countDemo().products === 0 && repo.countReal().products === 0;
  if (demo && isFresh) seedDemo(repo);
  const providers = opts.providers ?? createProviders();
  const password = opts.password ?? process.env.APP_PASSWORD ?? undefined;
  // HTTPS：TLS_CERT_FILE と TLS_KEY_FILE（PEM）の両方があればHTTPSで待ち受ける
  const certFile = process.env.TLS_CERT_FILE, keyFile = process.env.TLS_KEY_FILE;
  if (!opts.tls && !!certFile !== !!keyFile) throw new Error('HTTPSにするには TLS_CERT_FILE と TLS_KEY_FILE の両方を設定してください');
  const tls = opts.tls ?? (certFile && keyFile ? { cert: readFileSync(certFile, 'utf8'), key: readFileSync(keyFile, 'utf8') } : undefined);
  const handler = createHandler(repo, publicDir, providers, { password: password || undefined, https: !!tls });
  const server: Server = tls ? createHttpsServer({ cert: tls.cert, key: tls.key }, handler) : createServer(handler);
  const scheme = tls ? 'https' : 'http';
  const port = opts.port ?? Number(process.env.PORT ?? 3000);
  const host = opts.host ?? process.env.HOST ?? '0.0.0.0';
  return new Promise((ok) => {
    server.listen(port, host, () => {
      const addr = server.address();
      const realPort = typeof addr === 'object' && addr ? addr.port : port;
      const url = `${scheme}://localhost:${realPort}`;
      if (!opts.quiet) {
        console.log(`BOOKOFF利益商品検索ツール 起動: ${url}`);
        if (added) console.log(`店舗マスタ: ${added}店舗を登録`);
        console.log(`Amazon中古の自動取得（Keepa）: ${process.env.KEEPA_API_KEY ? '有効' : '無効（KEEPA_API_KEY 未設定）'}`);
        const users = repo.countUsers();
        console.log(users > 0 ? `ログイン: ユーザー別（${users}人。管理は「設定」→「ユーザー」）`
          : `アクセス用パスワード: ${password ? '設定あり' : 'なし（同じWi-Fiの人は誰でも開けます。APP_PASSWORD か「設定」→「ユーザー」で設定できます）'}`);
        console.log(`通信: ${tls ? 'HTTPS（暗号化あり）' : 'HTTP（暗号化なし。インターネットに公開する場合はHTTPSにしてください。docs/architecture.md）'}`);
        for (const list of Object.values(networkInterfaces())) {
          for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) console.log(`スマホから（同一Wi-Fi）: ${scheme}://${a.address}:${realPort}`);
        }
      }
      ok({ server, repo, url });
    });
  });
}

if (process.argv[1] && /main\.(ts|mjs|js)$/.test(process.argv[1])) {
  startServer().catch((e) => { console.error(e); process.exit(1); });
}
