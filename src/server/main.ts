import { createServer, type Server } from 'node:http';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { openDb } from './db.ts';
import { Repository } from './repository.ts';
import { createHandler } from './api.ts';
import { ensureSettings, seedDemo, seedStores } from './seed.ts';
import { createProviders } from './providers/registry.ts';
import type { AnyProvider } from './providers/types.ts';

export interface StartOptions { port?: number; host?: string; dbPath?: string; publicDir?: string; demo?: boolean; quiet?: boolean; providers?: AnyProvider[]; password?: string }

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
  const server = createServer(createHandler(repo, publicDir, providers, { password: password || undefined }));
  const port = opts.port ?? Number(process.env.PORT ?? 3000);
  const host = opts.host ?? process.env.HOST ?? '0.0.0.0';
  return new Promise((ok) => {
    server.listen(port, host, () => {
      const addr = server.address();
      const realPort = typeof addr === 'object' && addr ? addr.port : port;
      const url = `http://localhost:${realPort}`;
      if (!opts.quiet) {
        console.log(`BOOKOFF利益商品検索ツール 起動: ${url}`);
        if (added) console.log(`店舗マスタ: ${added}店舗を登録`);
        console.log(`Amazon中古の自動取得（Keepa）: ${process.env.KEEPA_API_KEY ? '有効' : '無効（KEEPA_API_KEY 未設定）'}`);
        console.log(`アクセス用パスワード: ${password ? '設定あり' : 'なし（同じWi-Fiの人は誰でも開けます。APP_PASSWORD で設定できます）'}`);
        for (const list of Object.values(networkInterfaces())) {
          for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) console.log(`スマホから（同一Wi-Fi）: http://${a.address}:${realPort}`);
        }
      }
      ok({ server, repo, url });
    });
  });
}

if (process.argv[1] && /main\.(ts|mjs|js)$/.test(process.argv[1])) {
  startServer().catch((e) => { console.error(e); process.exit(1); });
}
