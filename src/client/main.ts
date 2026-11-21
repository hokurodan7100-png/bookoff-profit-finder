import { api, type Meta } from './api.ts';
import type { Me } from '../shared/types.ts';
import { ROLE_LABEL } from '../shared/constants.ts';
import { $, html, mount, toast } from './dom.ts';
import { renderList } from './views/list.ts';
import { renderCheck } from './views/check.ts';
import { renderImport, renderSettings, renderSources, renderStores } from './views/other.ts';

const NAV = [
  { path: '/', label: '利益商品一覧', short: '一覧' },
  { path: '/check', label: '確認待ち', short: '確認待ち' },
  { path: '/stores', label: '店舗マスタ', short: '店舗' },
  { path: '/import', label: '取込・出力', short: '取込' },
  { path: '/settings', label: '設定', short: '設定' },
  { path: '/sources', label: 'データ取得元', short: '取得元' },
];

let meta: Meta;
let me: Me;

function route(): { path: string; query: URLSearchParams } {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  return { path: path || '/', query: new URLSearchParams(qs ?? '') };
}

function shell() {
  mount(document.body, html`
    <header class="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
      <div class="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2 sm:px-4">
        <a href="#/" class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-slate-900">¥</span>
          <span class="leading-tight">BOOKOFF利益商品検索<span class="block text-[10px] font-normal text-slate-300">静岡・山梨・神奈川</span></span></a>
        <nav class="ml-auto hidden md:flex gap-1" aria-label="メイン">${NAV.map((n) => html`<a href="#${n.path}" data-nav="${n.path}" class="rounded-md px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">${n.label}</a>`)}</nav>
        <span id="whoami" class="ml-auto text-right text-[11px] leading-tight text-slate-300 md:ml-2"></span>
      </div>
    </header>
    <div id="banner"></div>
    <main id="view" class="mx-auto max-w-[1400px] px-3 py-4 pb-24 sm:px-4 md:pb-8"></main>
    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden" aria-label="メイン（モバイル）">
      ${NAV.map((n) => html`<a href="#${n.path}" data-nav="${n.path}" class="px-1 py-2.5 text-center text-[11px] text-slate-600">${n.short}</a>`)}
    </nav>`);
}

function banner() {
  const d = meta.counts.demo;
  const el = $('#banner')!;
  if (d.products === 0) { mount(el, html``); return; }
  mount(el, html`<div class="border-b border-violet-200 bg-violet-50" data-testid="demo-banner"><div class="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-3 py-2 text-sm text-violet-900 sm:px-4">
    <span class="rounded bg-violet-600 px-1.5 py-0.5 text-xs font-bold text-white">デモ</span>
    <span>架空のデモデータ ${d.products}件を含みます。価格・在庫は実在しません（実データ ${meta.counts.real.products}件）。</span>
    <a href="#/import" class="ml-auto underline">デモの削除・CSV取込へ</a></div></div>`);
}

function whoami() {
  const el = $('#whoami')!;
  if (me.authMode !== 'accounts') { mount(el, html``); return; }
  mount(el, html`<span data-testid="whoami">${me.username}<span class="block">${ROLE_LABEL[me.role]}</span></span>`);
}

async function refreshMeta() {
  [meta, me] = await Promise.all([api.meta(), api.me()]);
  banner(); whoami();
  if (me.role === 'viewer') $('#banner')!.insertAdjacentHTML('beforeend', html`<div class="border-b border-sky-200 bg-sky-50 px-3 py-1.5 text-center text-xs text-sky-900" data-testid="viewer-banner">閲覧のみの権限です。登録・取込・削除はできません（CSV出力はできます）。</div>`.value);
}

async function render() {
  const { path, query } = route();
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((a) => {
    const active = a.dataset.nav === path;
    a.classList.toggle('!bg-slate-800', active && !!a.closest('header'));
    a.classList.toggle('!text-amber-600', active && !a.closest('header'));
    a.classList.toggle('font-semibold', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const view = $('#view')!;
  const title = NAV.find((n) => n.path === path)?.label ?? '利益商品一覧';
  document.title = `${title}｜BOOKOFF利益商品検索`;
  try {
    if (path === '/check') await renderCheck(view, meta);
    else if (path === '/stores') await renderStores(view, meta);
    else if (path === '/import') renderImport(view, meta, async (reload) => { await refreshMeta(); if (reload) renderImport(view, meta, () => refreshMeta()); });
    else if (path === '/settings') await renderSettings(view, me);
    else if (path === '/sources') await renderSources(view);
    else await renderList(view, meta, query);
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

async function boot() {
  shell();
  try { await refreshMeta(); } catch (e) { toast(`起動に失敗しました：${(e as Error).message}`, 'error'); return; }
  let lastPath = route().path;
  window.addEventListener('hashchange', () => {
    const p = route().path;
    // 一覧の絞り込みは replaceState で書き換えるので、パスが変わったときだけ再描画
    if (p !== lastPath || p !== '/') { lastPath = p; refreshMeta().then(render); }
  });
  await render();
}

boot();
