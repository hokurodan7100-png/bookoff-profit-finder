import { api, type Meta } from '../api.ts';
import { $, $$, debounce, html, mount, options, raw, toast, type Raw } from '../dom.ts';
import { filtersFromParams, filtersToParams, profitOf } from '../../shared/filters.ts';
import { jstDateTime, percent, signedYen, yen } from '../../shared/format.ts';
import { MARKETPLACE_LABEL, MARKETPLACES, NA, PRICE_TYPE_LABEL, type Marketplace } from '../../shared/constants.ts';
import { ageLabel } from '../../shared/stock.ts';
import type { ItemFilters, ItemRow, MarketSummary } from '../../shared/types.ts';
import { openDetail } from './detail.ts';
import { openCreateProduct } from './create.ts';

const SORT_LABEL: Record<string, string> = {
  profit_desc: '利益額が高い順', margin_desc: '利益率が高い順', price_asc: '仕入れ価格が安い順', updated_desc: '更新日時が新しい順',
  premium_desc: 'プレミア率が高い順（Amazon中古÷定価）',
};

export const profitClass = (v: number | null | undefined) =>
  v == null ? 'text-slate-400' : v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-600' : 'text-slate-700';

export function stockChip(status: string | undefined, ageDays: number | null = null): Raw {
  const s = status ?? '在庫未確認';
  const cls = s === '在庫あり（確認済）' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : s === '要再確認' ? 'bg-orange-100 text-orange-800 ring-orange-300'
    : s === '在庫なし（確認済）' ? 'bg-slate-100 text-slate-600 ring-slate-200' : 'bg-amber-50 text-amber-800 ring-amber-200';
  const title = s === '要再確認' ? '在庫ありと確認してから日数が経っています。売れている可能性があるので、行く前に確認してください' : '';
  return html`<span class="inline-flex flex-wrap items-center gap-x-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}" title="${title}" data-testid="stock-chip"><span class="whitespace-nowrap">${s}</span>${ageDays != null ? html`<span class="whitespace-nowrap font-normal opacity-80">${ageLabel(ageDays)}</span>` : ''}</span>`;
}

/** 定価とプレミア表示 */
export function listPriceLine(r: ItemRow): Raw {
  const p = r.premium;
  if (p.listPrice == null) return html`<div class="text-[11px] text-slate-400">定価 ${NA}</div>`;
  return html`<div class="text-[11px] ${p.buyAtOrBelowList ? 'text-slate-500' : 'text-red-600'}">定価 ${yen(p.listPrice)}${p.buyAtOrBelowList ? '' : '（超え）'}</div>`;
}
export function premiumBadge(r: ItemRow): Raw {
  const p = r.premium;
  if (!p.overList || p.ratio == null) return html``;
  if (p.bothOverList) {
    return html`<span class="inline-block rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-white" title="Amazon中古とフリマの売却済み価格の両方が定価を超えています" data-testid="premium-badge">両方で定価超え <span class="whitespace-nowrap">Amazon ${p.ratio.toFixed(2)}倍・フリマ ${p.fleaRatio!.toFixed(2)}倍</span></span>`;
  }
  return html`<span class="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700" title="Amazon中古の相場が定価を超えています" data-testid="premium-badge">プレミア 定価の${p.ratio.toFixed(2)}倍</span>`;
}

export const demoBadge = () => html`<span class="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700" title="架空のデモデータ">デモ</span>`;

function thumb(row: ItemRow, size = 'h-14 w-14'): Raw {
  return row.product.imageUrl
    ? html`<img src="${row.product.imageUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" class="${size} shrink-0 rounded bg-slate-100 object-cover">`
    : html`<div class="${size} shrink-0 rounded bg-slate-100 text-[10px] leading-tight text-slate-400 grid place-items-center text-center">画像<br>未取得</div>`;
}

function marketCell(m: MarketSummary): Raw {
  if (!m.chosen) return html`<span class="text-slate-400">${NA}</span>`;
  const others = (['estimate', 'sold', 'listing'] as const).filter((t) => m.latest[t] && m.latest[t]!.id !== m.chosen!.id);
  return html`<div class="font-semibold tabular-nums">${yen(m.chosen.price)}</div>
    <div class="text-[11px] text-slate-500">${PRICE_TYPE_LABEL[m.chosen.priceType]}${m.chosen.sampleCount != null ? ` (n=${m.chosen.sampleCount})` : ''}</div>
    ${others.map((t) => html`<div class="text-[11px] text-slate-400">${PRICE_TYPE_LABEL[t]} ${yen(m.latest[t]!.price)}</div>`)}
    <div class="text-[11px] tabular-nums ${profitClass(m.profit?.profit)}">利益 ${signedYen(m.profit?.profit)}</div>`;
}

function rowTable(r: ItemRow, mp?: Marketplace): Raw {
  const shown = profitOf(r, mp);
  const via = mp ?? r.best;
  const best = via && shown ? MARKETPLACE_LABEL[via] : null;
  return html`<tr class="cursor-pointer border-b border-slate-100 hover:bg-amber-50/40 align-top" data-product="${r.product.id}" data-testid="item-row">
    <td class="p-2"><div class="flex gap-3">${thumb(r)}<div class="min-w-0">
      <div class="font-medium text-slate-900 line-clamp-2">${r.product.name}</div>
      <div class="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
        <span class="rounded bg-slate-100 px-1.5 py-0.5">${r.product.category}</span>
        <span>${r.product.jan ? `JAN ${r.product.jan}` : r.product.isbn ? `ISBN ${r.product.isbn}` : 'JAN/ISBN 未取得'}</span>
        ${premiumBadge(r)}${r.isDemo ? demoBadge() : ''}
      </div></div></div></td>
    <td class="p-2 text-right whitespace-nowrap"><div class="font-semibold tabular-nums">${yen(r.offer?.price)}</div>${listPriceLine(r)}<div class="text-[11px] text-slate-500">${r.offer?.condition ?? NA}</div></td>
    <td class="p-2"><div class="text-sm">${r.store?.name ?? NA}</div>
      <div class="text-[11px] text-slate-500">${r.store ? `${r.store.prefecture}・${r.store.brandType}` : ''}</div>
      <div class="mt-1">${stockChip(r.stock.status, r.stock.ageDays)}</div></td>
    <td class="p-2 text-right whitespace-nowrap">${marketCell(r.markets.mercari)}</td>
    <td class="p-2 text-right whitespace-nowrap">${marketCell(r.markets.yahoo_fleamarket)}</td>
    <td class="p-2 text-right whitespace-nowrap">${marketCell(r.markets.amazon_used)}</td>
    <td class="p-2 text-right"><div class="text-base font-bold tabular-nums ${profitClass(shown?.profit)}" data-testid="profit">${signedYen(shown?.profit)}</div>
      <div class="whitespace-nowrap text-[11px] text-slate-500">${best ? `${best}で販売` : ''}</div></td>
    <td class="p-2 text-right"><div class="font-semibold tabular-nums ${profitClass(shown?.profit)}">${percent(shown?.marginPercent)}</div>
      <div class="text-[11px] text-slate-500">ROI ${percent(shown?.roiPercent)}</div></td>
    <td class="p-2 text-[11px] text-slate-500 whitespace-nowrap"><div>在庫 ${jstDateTime(r.offer?.checkedAt)}</div><div>相場 ${jstDateTime(r.latestMarketObservedAt)}</div></td>
  </tr>`;
}

function rowCard(r: ItemRow, judge?: Marketplace): Raw {
  const shown = profitOf(r, judge);
  const via = judge ?? r.best;
  const mp = (m: Marketplace) => {
    const s = r.markets[m];
    return html`<div class="rounded bg-slate-50 p-2"><div class="text-[11px] text-slate-500">${MARKETPLACE_LABEL[m]}相場</div>
      <div class="font-semibold tabular-nums">${s.chosen ? yen(s.chosen.price) : NA}</div>
      <div class="text-[11px] text-slate-500">${s.chosen ? PRICE_TYPE_LABEL[s.chosen.priceType] : ''}</div>
      <div class="text-[11px] tabular-nums ${profitClass(s.profit?.profit)}">利益 ${signedYen(s.profit?.profit)}</div></div>`;
  };
  return html`<article class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:bg-slate-50" data-product="${r.product.id}" data-testid="item-card">
    <div class="flex gap-3">${thumb(r, 'h-16 w-16')}<div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2"><h3 class="font-medium leading-snug line-clamp-2">${r.product.name}</h3>${r.isDemo ? demoBadge() : ''}</div>
      ${r.premium.overList ? html`<div class="mt-1">${premiumBadge(r)}</div>` : ''}
      <div class="mt-1 text-[11px] text-slate-500">${r.product.category}・${r.store?.name ?? `店舗${NA}`}</div>
      <div class="mt-1">${stockChip(r.stock.status, r.stock.ageDays)}</div></div></div>
    <div class="mt-3 flex items-end justify-between rounded-lg px-3 py-2 ${shown == null ? 'bg-slate-50' : shown.profit > 0 ? 'bg-emerald-50' : 'bg-red-50'}">
      <div><div class="text-[11px] text-slate-500">想定利益${via && shown ? `（${MARKETPLACE_LABEL[via]}で販売）` : ''}</div>
        <div class="text-xl font-bold tabular-nums ${profitClass(shown?.profit)}" data-testid="profit">${signedYen(shown?.profit)}</div></div>
      <div class="text-right"><div class="text-[11px] text-slate-500">利益率</div><div class="font-semibold ${profitClass(shown?.profit)}">${percent(shown?.marginPercent)}</div></div>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
      <div class="rounded bg-amber-50 p-2"><div class="text-[11px] text-slate-500">BOOKOFF価格</div><div class="font-semibold tabular-nums">${yen(r.offer?.price)}</div>${listPriceLine(r)}</div>
      ${MARKETPLACES.map(mp)}
    </div>
    <div class="mt-1 text-[11px] text-slate-400">情報取得 ${jstDateTime(r.updatedAt)}</div>
  </article>`;
}

function filterForm(meta: Meta, f: ItemFilters): Raw {
  const input = (name: keyof ItemFilters, label: string, type = 'text', extra = '') => html`<label class="block"><span class="lbl">${label}</span>
    <input class="inp" name="${name}" type="${type}" value="${f[name] ?? ''}" ${raw(extra)}></label>`;
  return html`<form id="filters" class="space-y-3" autocomplete="off">
    <label class="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm font-semibold text-emerald-800">
      <input type="checkbox" name="profitOnly" value="1" class="h-4 w-4 accent-emerald-600" ${f.profitOnly !== false ? raw('checked') : ''}> 利益が出る商品のみ表示</label>
    <div class="space-y-1 rounded-lg bg-rose-50 p-2">
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="premiumOnly" value="1" class="h-4 w-4 accent-rose-600" ${f.premiumOnly ? raw('checked') : ''}> Amazon中古が定価超え（プレミア）のみ</label>
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="bothOver" value="1" class="h-4 w-4 accent-rose-600" ${f.bothOver ? raw('checked') : ''}> フリマの売却済み価格でも定価超え（両方）のみ</label>
      <label class="flex items-center gap-2 text-sm font-semibold text-rose-800"><input type="checkbox" name="belowList" value="1" class="h-4 w-4 accent-rose-600" ${f.belowList ? raw('checked') : ''}> BOOKOFF価格が定価以下のみ</label>
      <p class="text-[11px] leading-snug text-rose-700">フリマ側はYahoo!フリマ・メルカリの売却済み価格のうち低い方で判定します。
        フリマ未確認の候補は<a class="font-semibold underline" href="#/check">確認待ち</a>へ。</p>
      <button type="button" id="premium-preset" class="mt-1 w-full rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">プレミア商品を探す</button>
    </div>
    <label class="block"><span class="lbl">利益を判定する販路</span><select class="inp" name="marketplace">
      ${options([...MARKETPLACES], f.marketplace, MARKETPLACE_LABEL, '最も利益が出る販路')}</select></label>
    ${input('q', '商品名', 'search', 'placeholder="例：問題集"')}
    ${input('code', 'JAN・ISBN', 'search', 'inputmode="numeric" placeholder="一部でも可"')}
    <div class="grid grid-cols-2 gap-2">
      <label class="block"><span class="lbl">都道府県</span><select class="inp" name="prefecture">${options(meta.prefectures, f.prefecture, undefined, 'すべて')}</select></label>
      <label class="block"><span class="lbl">店舗種別</span><select class="inp" name="brandType">
        <option value="">すべて</option>
        <option value="core" ${f.brandType === 'core' ? raw('selected') : ''}>総合（BOOKOFF系3業態）</option>
        <option value="related" ${f.brandType === 'related' ? raw('selected') : ''}>関連業態</option>
        ${options(meta.brandTypes, f.brandType)}</select></label>
    </div>
    ${f.storeId !== undefined ? html`<input type="hidden" name="storeId" value="${f.storeId}">
      <div class="flex items-center justify-between gap-2 rounded-lg bg-amber-50 p-2 text-sm" data-testid="store-chip">
        <span>店舗：<b id="store-chip-name">選択中の店舗</b></span>
        <button type="button" id="clear-store" class="rounded px-2 text-slate-500 hover:bg-amber-100" aria-label="店舗の指定を外す">✕</button></div>` : ''}
    ${input('store', '店舗名', 'search', 'list="store-names" placeholder="例：富士宮"')}
    <datalist id="store-names"></datalist>
    <div class="grid grid-cols-2 gap-2">
      <label class="block"><span class="lbl">カテゴリ</span><select class="inp" name="category">${options(meta.categories, f.category, undefined, 'すべて')}</select></label>
      <label class="block"><span class="lbl">在庫確認状態</span><select class="inp" name="stockStatus">${options(meta.filterStockStatuses, f.stockStatus, undefined, 'すべて')}</select></label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      ${input('minProfit', '最低利益額（円）', 'number', 'inputmode="numeric" step="1"')}
      ${input('minMargin', '最低利益率（%）', 'number', 'inputmode="decimal" step="0.1"')}
    </div>
    <div><span class="lbl">仕入れ価格帯（円）</span><div class="grid grid-cols-2 gap-2">
      <input class="inp" name="priceMin" type="number" inputmode="numeric" placeholder="下限" value="${f.priceMin ?? ''}" aria-label="仕入れ価格 下限">
      <input class="inp" name="priceMax" type="number" inputmode="numeric" placeholder="上限" value="${f.priceMax ?? ''}" aria-label="仕入れ価格 上限"></div></div>
    <div class="grid grid-cols-2 gap-2">
      ${input('marketSince', '相場の取得日（以降）', 'date')}
      <label class="block"><span class="lbl">データ種別</span><select class="inp" name="dataKind">
        ${options(['all', 'real', 'demo'], f.dataKind, { all: 'すべて', real: '実データのみ', demo: 'デモのみ' })}</select></label>
    </div>
    <div class="flex gap-2 pt-1"><button type="reset" class="btn-secondary flex-1" id="reset-filters">条件をクリア</button></div>
  </form>`;
}

let currentParams = new URLSearchParams();
let shownCount = 0;

export async function renderList(root: HTMLElement, meta: Meta, query: URLSearchParams) {
  const f = filtersFromParams(query);
  mount(root, html`
    <div class="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-6">
      <aside class="mb-4 lg:mb-0">
        <details class="group rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20" id="filter-panel" ${window.matchMedia('(min-width:1024px)').matches ? raw('open') : ''}>
          <summary class="flex cursor-pointer list-none items-center justify-between font-semibold">
            <span>絞り込み</span><span class="text-xs text-slate-400 group-open:hidden">タップで開く</span></summary>
          <div class="mt-3">${filterForm(meta, f)}</div>
        </details>
      </aside>
      <section class="min-w-0">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <div class="text-sm text-slate-600" id="result-count" aria-live="polite">読み込み中…</div>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <label class="sr-only" for="sort">並び替え</label>
            <select id="sort" class="inp !w-auto">${options(Object.keys(SORT_LABEL), f.sort, SORT_LABEL)}</select>
            <button id="amazon-refresh" class="btn-secondary hidden" type="button" title="Keepa APIでAmazon中古価格を取得">Amazon中古価格を更新</button>
            <a id="export" class="btn-secondary" href="#">CSVエクスポート</a>
            <button id="add-product" class="btn-primary" type="button">＋ 手動登録</button>
          </div>
        </div>
        <div id="results"></div>
      </section>
    </div>`);

  api.stores().then(({ stores }) => {
    const dl = $('#store-names');
    if (dl) mount(dl, html`${stores.map((s) => html`<option value="${s.name}"></option>`)}`);
    const chip = $('#store-chip-name');
    if (chip && f.storeId !== undefined) chip.textContent = stores.find((s) => s.id === f.storeId)?.name ?? `店舗ID ${f.storeId}`;
  }).catch(() => {});

  const form = $<HTMLFormElement>('#filters', root)!;
  const sort = $<HTMLSelectElement>('#sort', root)!;
  const read = (): ItemFilters => {
    const p = new URLSearchParams();
    new FormData(form).forEach((v, k) => { if (String(v).trim() !== '') p.set(k, String(v)); });
    p.set('profitOnly', $<HTMLInputElement>('input[name=profitOnly]', form)!.checked ? '1' : '0');
    p.set('premiumOnly', $<HTMLInputElement>('input[name=premiumOnly]', form)!.checked ? '1' : '0');
    p.set('belowList', $<HTMLInputElement>('input[name=belowList]', form)!.checked ? '1' : '0');
    p.set('bothOver', $<HTMLInputElement>('input[name=bothOver]', form)!.checked ? '1' : '0');
    p.set('sort', sort.value);
    return filtersFromParams(p);
  };
  const refresh = async () => {
    const filters = read();
    currentParams = filtersToParams(filters);
    if (filters.dataKind === 'all') currentParams.delete('dataKind');
    history.replaceState(null, '', `#/?${currentParams}`);
    $<HTMLAnchorElement>('#export', root)!.href = `/api/export.csv?${currentParams}`;
    await loadResults(root);
  };
  const deb = debounce(refresh, 250);
  form.addEventListener('input', deb);
  form.addEventListener('change', deb);
  form.addEventListener('submit', (e) => { e.preventDefault(); refresh(); });
  form.addEventListener('reset', () => setTimeout(() => { $<HTMLInputElement>('input[name=profitOnly]', form)!.checked = true; refresh(); }, 0));
  sort.addEventListener('change', refresh);
  $('#clear-store', root)?.addEventListener('click', () => {
    $('input[name=storeId]', form)?.remove();
    $('[data-testid=store-chip]', form)?.remove();
    refresh();
  });
  $('#premium-preset', root)!.addEventListener('click', () => {
    // 定価超え＋定価以下で仕入れ＋利益が出る＋Amazon中古で判定、プレミア率順
    $<HTMLInputElement>('input[name=premiumOnly]', form)!.checked = true;
    $<HTMLInputElement>('input[name=belowList]', form)!.checked = true;
    $<HTMLInputElement>('input[name=bothOver]', form)!.checked = true;
    $<HTMLInputElement>('input[name=profitOnly]', form)!.checked = true;
    $<HTMLSelectElement>('select[name=marketplace]', form)!.value = 'amazon_used';
    sort.value = 'premium_desc';
    refresh();
  });
  $('#add-product', root)!.addEventListener('click', () => openCreateProduct(meta, () => loadResults(root)));
  api.providers().then(({ providers }) => {
    const keepa = providers.find((p) => p.id === 'amazon-used-keepa');
    const btn = $<HTMLButtonElement>('#amazon-refresh', root);
    if (!keepa?.configured || !btn) return;
    btn.classList.remove('hidden');
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = '取得中…';
      try {
        const r = await api.runBulk('amazon-used-keepa');
        toast(`Amazon中古価格：${r.requested}件を照会、${r.matched}件取得、${r.notFound}件見つからず、定価${r.listPricesSet}件を設定`);
        await loadResults(root);
      } catch (e) { toast((e as Error).message, 'error'); }
      btn.disabled = false; btn.textContent = 'Amazon中古価格を更新';
    });
  }).catch(() => {});
  $('#results', root)!.addEventListener('keydown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-product]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(Number(el.dataset.product), meta, () => loadResults(root)); }
  });
  $('#results', root)!.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-product]');
    if (el) openDetail(Number(el.dataset.product), meta, () => loadResults(root));
  });
  await refresh();
}

async function loadResults(root: HTMLElement) {
  const box = $('#results', root);
  if (!box) return;
  try {
    const { rows, matched, total } = await api.items(currentParams);
    shownCount = rows.length;
    const f = filtersFromParams(currentParams);
    const judge = f.marketplace;
    const label = f.bothOver ? `両方で定価超えの商品 ${matched.toLocaleString()}件` : f.premiumOnly ? `プレミア商品 ${matched.toLocaleString()}件` : f.profitOnly ? `利益が出る商品 ${matched.toLocaleString()}件` : `${matched.toLocaleString()}件 該当`;
    const countText = () => `${label}（全${total.toLocaleString()}件）${matched > shownCount ? `・${shownCount}件を表示中` : ''}`;
    $('#result-count', root)!.textContent = countText();
    if (rows.length === 0) {
      mount(box, html`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        ${f.profitOnly ? '条件に合う、利益が出る商品はありません。「利益が出る商品のみ表示」を外すと全件を確認できます。' : '条件に合う商品がありません。'}<br>
        <a class="text-sky-700 underline" href="#/import">CSVを取り込む</a>か、「＋ 手動登録」から追加してください。</div>`);
      return;
    }
    mount(box, html`
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[1080px] text-sm" data-testid="items-table">
          <thead class="sticky top-0 bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr><th class="p-2">商品名</th><th class="p-2 text-right whitespace-nowrap">BOOKOFF価格</th><th class="p-2">対象店舗</th>
              <th class="p-2 text-right whitespace-nowrap">メルカリ相場</th><th class="p-2 text-right whitespace-nowrap">Yahoo!フリマ相場</th>
              <th class="p-2 text-right whitespace-nowrap">Amazon中古相場</th>
              <th class="p-2 text-right">想定利益</th><th class="p-2 text-right">利益率</th><th class="p-2">情報取得日時</th></tr>
          </thead>
          <tbody>${rows.map((r) => rowTable(r, judge))}</tbody>
        </table>
      </div>
      <div class="grid gap-3 md:hidden" data-testid="items-cards">${rows.map((r) => rowCard(r, judge))}</div>
      ${matched > rows.length ? html`<div class="mt-4 text-center"><button type="button" id="load-more" class="btn-secondary">さらに表示（残り ${matched - rows.length}件）</button></div>` : ''}`);
    $('#load-more', box)?.addEventListener('click', async function handler(this: HTMLButtonElement) {
      const btn = this;
      btn.disabled = true;
      try {
        const p = new URLSearchParams(currentParams);
        p.set('offset', String(shownCount));
        const more = await api.items(p);
        const tbody = $('[data-testid=items-table] tbody', box)!;
        const cards = $('[data-testid=items-cards]', box)!;
        tbody.insertAdjacentHTML('beforeend', html`${more.rows.map((r) => rowTable(r, judge))}`.value);
        cards.insertAdjacentHTML('beforeend', html`${more.rows.map((r) => rowCard(r, judge))}`.value);
        shownCount += more.rows.length;
        $$('[data-product]', box).forEach((el) => el.setAttribute('tabindex', '0'));
        $('#result-count', root)!.textContent = countText();
        if (shownCount >= matched) btn.parentElement!.remove();
        else { btn.textContent = `さらに表示（残り ${matched - shownCount}件）`; btn.disabled = false; }
      } catch (e) { toast((e as Error).message, 'error'); btn.disabled = false; }
    });
  } catch (e) {
    toast(`一覧の取得に失敗しました：${(e as Error).message}`, 'error');
  }
  $$('[data-product]', box).forEach((el) => el.setAttribute('tabindex', '0'));
}
