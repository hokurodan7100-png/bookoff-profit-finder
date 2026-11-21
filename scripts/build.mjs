// ビルド：クライアント(esbuild) + CSS(Tailwind v4 compile API) + サーバ単一ファイル(esbuild)
import { build } from 'esbuild';
import { compile } from 'tailwindcss';
import { createRequire } from 'node:module';
import { cp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const pub = join(out, 'public');
const require = createRequire(import.meta.url);
const twDir = dirname(require.resolve('tailwindcss/package.json'));

await rm(out, { recursive: true, force: true });
await mkdir(pub, { recursive: true });

// 1) client
await build({
  entryPoints: [join(root, 'src/client/main.ts')],
  bundle: true, format: 'esm', target: ['es2022', 'safari15'], minify: true, sourcemap: true,
  outfile: join(pub, 'app.js'), logLevel: 'warning',
});

// 2) server（依存を同梱。node:* は外部）
await build({
  entryPoints: [join(root, 'src/server/main.ts')],
  bundle: true, platform: 'node', format: 'esm', target: 'node22', sourcemap: true,
  outfile: join(out, 'main.mjs'), logLevel: 'warning',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});

// 3) Tailwind：ソース中のクラス候補を抽出して生成
async function walk(dir) {
  const res = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) res.push(...(await walk(p)));
    else if (/\.(ts|html)$/.test(e.name)) res.push(p);
  }
  return res;
}
const files = [...(await walk(join(root, 'src/client'))), ...(await walk(join(root, 'public')))];
const candidates = new Set();
for (const f of files) {
  for (const tok of (await readFile(f, 'utf8')).split(/[\s"'`<>={}()$,;]+/)) if (tok && tok.length < 80) candidates.add(tok);
}
const cssSrc = await readFile(join(root, 'src/client/styles.css'), 'utf8');
const compiler = await compile(cssSrc, {
  base: root,
  loadStylesheet: async (id, base) => {
    const p = id === 'tailwindcss' ? join(twDir, 'index.css') : id.startsWith('tailwindcss/') ? join(twDir, id.slice(12)) : resolve(base, id);
    return { path: p, base: dirname(p), content: await readFile(p, 'utf8') };
  },
});
await writeFile(join(pub, 'app.css'), compiler.build([...candidates]));

// 4) static
await cp(join(root, 'public'), pub, { recursive: true });
await writeFile(join(pub, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#fbbf24"/><text x="32" y="45" font-size="38" text-anchor="middle" font-family="sans-serif" font-weight="700" fill="#0f172a">¥</text></svg>`);
await writeFile(join(pub, 'manifest.webmanifest'), JSON.stringify({
  name: 'BOOKOFF利益商品検索', short_name: '利益検索', start_url: '/', display: 'standalone', background_color: '#f1f5f9', theme_color: '#0f172a',
  icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
}));
console.log(`build ok → ${out}（CSS候補 ${candidates.size}語）`);
