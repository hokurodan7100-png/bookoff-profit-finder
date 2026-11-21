import { openDetail } from './detail.ts';
import { api, type Meta } from '../api.ts';
import { $, $$, html, mount, options, toast, type Raw } from '../dom.ts';
import { decodeCsvBytes } from '../../shared/csv.ts';
import { jstDateTime, signedYen, yen } from '../../shared/format.ts';
import { BRAND_GROUP_LABEL, CATEGORIES, MARKETPLACE_LABEL, MARKETPLACES, NA, PRICE_TYPE_LABEL, type Category, type Marketplace } from '../../shared/constants.ts';
import { calcProfit, feeTerms } from '../../shared/profit.ts';
import type { CategoryFee, DuplicateGroup, EstimateResult, ImportResult, Settings, Store, StoreDiff, StoreSummary } from '../../shared/types.ts';
import type { PriceType } from '../../shared/constants.ts';
import { openDialog } from './detail.ts';

const card = (title: string, body: Raw, extra = '') => html`<section class="rounded-xl border border-slate-200 bg-white p-4 ${extra}">
  <h2 class="mb-3 font-semibold">${title}</h2>${body}</section>`;

// ---------------- 店舗マスタ ----------------
const statusClass = (s: string) => s === '営業中' ? 'bg-emerald-50 text-emerald-700' : s === '閉店' ? 'bg-slate-200 text-slate-600' : 'bg-amber-50 text-amber-800';

export async function renderStores(root: HTMLElement, meta: Meta) {
  const [{ stores }, { summary }] = await Promise.all([api.stores(), api.storeSummary()]);
  const sum = new Map(summary.map((x) => [x.storeId, x]));
  const counts = meta.prefectures.map((p) => ({ p, n: stores.filter((s) => s.prefecture === p).length }));
  mount(root, html`
    <div class="mb-3 grid grid-cols-3 gap-2 sm:gap-3">${counts.map(({ p, n }) => html`<button type="button" data-pref="${p}" class="rounded-xl border border-slate-200 bg-white p-2 text-left hover:border-amber-400 sm:p-3">
      <div class="text-xs text-slate-500">${p}</div><div class="text-xl font-bold sm:text-2xl">${n}<span class="text-xs font-normal text-slate-500 sm:text-sm"> 店舗</span></div>
      <div class="text-[11px] text-emerald-700">利益商品のある店舗 ${stores.filter((s) => s.prefecture === p && (sum.get(s.id)?.profitable ?? 0) > 0).length}</div></button>`)}</div>
    <p class="mb-3 text-xs text-slate-500">県を選ぶと、利益が出る商品のある店舗を想定利益の多い順に並べます。店舗をタップするとその店舗の商品一覧を開きます。
      <span class="hidden sm:inline">初期データ：${meta.storeSeed.source}（確認 ${jstDateTime(meta.storeSeed.verifiedAt)}）。閉店・移転・改称は「取込・出力」の店舗CSVで更新できます。</span></p>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <select id="st-pref" class="inp !w-auto" aria-label="都道府県">${options(meta.prefectures, undefined, undefined, 'すべての都道府県')}</select>
      <select id="st-sort" class="inp !w-auto" aria-label="並び替え">${options(['profit', 'count', 'premium', 'official'], 'profit',
        { profit: '想定利益合計が多い順（在庫確認済）', count: '利益商品が多い順', premium: '両方で定価超えが多い順', official: '公式一覧の順' })}</select>
      <label class="flex items-center gap-1.5 text-sm"><input id="st-only" type="checkbox" class="h-4 w-4 accent-emerald-600" checked> 利益商品がある店舗のみ</label>
      <input id="st-q" class="inp !w-48" type="search" placeholder="店舗名・住所で検索" aria-label="店舗検索">
      <select id="st-brand" class="inp !w-auto" aria-label="店舗種別">${options(meta.brandTypes, undefined, undefined, 'すべての種別')}</select>
      <select id="st-status" class="inp !w-auto" aria-label="状態">${options(meta.storeStatuses, undefined, undefined, 'すべての状態')}</select>
      <span id="st-count" class="text-sm text-slate-500"></span>
    </div>
    <div id="st-list"></div>`);
  const empty = (id: number): StoreSummary => sum.get(id) ?? { storeId: id, profitable: 0, profitableInStock: 0, profitableUnconfirmed: 0, profitableStale: 0, premiumBoth: 0, profitSumInStock: 0, lastCheckedAt: null };
  const draw = () => {
    const q = ($<HTMLInputElement>('#st-q')!.value).trim();
    const pref = $<HTMLSelectElement>('#st-pref')!.value, brand = $<HTMLSelectElement>('#st-brand')!.value, st = $<HTMLSelectElement>('#st-status')!.value;
    const only = $<HTMLInputElement>('#st-only')!.checked, sortKey = $<HTMLSelectElement>('#st-sort')!.value;
    const list = stores.filter((s) => (!q || s.name.includes(q) || s.address.includes(q)) && (!pref || s.prefecture === pref)
      && (!brand || s.brandType === brand) && (!st || s.status === st) && (!only || empty(s.id).profitable > 0));
    const key = (s: Store) => { const x = empty(s.id); return sortKey === 'profit' ? x.profitSumInStock : sortKey === 'count' ? x.profitable : sortKey === 'premium' ? x.premiumBoth : 0; };
    if (sortKey !== 'official') list.sort((a, b) => key(b) - key(a) || empty(b.id).profitable - empty(a.id).profitable || a.id - b.id);
    $('#st-count')!.textContent = `${list.length}店舗`;
    if (!list.length) {
      mount($('#st-list')!, html`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500" data-testid="stores-empty">
        条件に合う店舗はありません。${only ? '「利益商品がある店舗のみ」を外すと全店舗を表示します。' : ''}</div>`);
      return;
    }
    mount($('#st-list')!, html`
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white"><table class="w-full min-w-[980px] text-sm" data-testid="stores-table">
        <thead class="bg-slate-50 text-left text-xs text-slate-600"><tr><th class="p-2">店舗名</th><th class="p-2">所在地</th><th class="p-2">状態</th>
          <th class="p-2 text-right">利益商品<br><span class="font-normal">在庫確認済／全件</span></th><th class="p-2 text-right">両方で<br>定価超え</th>
          <th class="p-2 text-right">想定利益合計<br><span class="font-normal">在庫確認済</span></th><th class="p-2">最終在庫確認</th><th class="p-2"></th></tr></thead>
        <tbody>${list.map((s) => storeRow(s, empty(s.id)))}</tbody></table></div>
      <div class="grid gap-2 md:hidden" data-testid="stores-cards">${list.map((s) => storeCard(s, empty(s.id)))}</div>`);
  };
  $$('#st-q, #st-pref, #st-brand, #st-status, #st-only, #st-sort', root).forEach((el) => el.addEventListener('input', draw));
  $$<HTMLButtonElement>('[data-pref]', root).forEach((b) => b.addEventListener('click', () => {
    $<HTMLSelectElement>('#st-pref')!.value = b.dataset.pref!;
    draw();
    $('#st-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  root.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('a')) return;
    const info = t.closest<HTMLElement>('[data-store-info]');
    if (info) { e.stopPropagation(); return showStoreInfo(stores, Number(info.dataset.storeInfo)); }
    const el = t.closest<HTMLElement>('[data-store]');
    if (el) location.hash = `#/?storeId=${el.dataset.store}&profitOnly=0`;
  });
  draw();
}

async function showStoreInfo(stores: Store[], id: number) {
  const s = stores.find((x) => x.id === id)!;
  const { events } = await api.storeEvents(s.id);
  openDialog(s.name, html`<dl class="grid grid-cols-[7rem_1fr] gap-1 text-sm">
    <dt class="text-slate-500">公式店舗ID</dt><dd>${s.officialId ?? NA}</dd><dt class="text-slate-500">店舗種別</dt><dd>${s.brandType}（${BRAND_GROUP_LABEL[s.brandGroup]}）</dd>
    <dt class="text-slate-500">所在地</dt><dd>${s.address}</dd><dt class="text-slate-500">状態</dt><dd>${s.status}</dd>
    <dt class="text-slate-500">後継店舗</dt><dd>${s.successorStoreId ? stores.find((x) => x.id === s.successorStoreId)?.name ?? NA : 'なし'}</dd>
    <dt class="text-slate-500">確認日時</dt><dd>${jstDateTime(s.verifiedAt)}</dd>
    <dt class="text-slate-500">備考</dt><dd>${s.note ?? 'なし'}</dd><dt class="text-slate-500">取得元</dt><dd class="text-xs">${s.source}</dd></dl>
    <h3 class="mt-4 mb-1 font-semibold">変更履歴</h3><ul class="text-sm">${events.map((ev) => html`<li class="border-t border-slate-100 py-1">
      <span class="text-xs text-slate-500">${jstDateTime(ev.occurredAt)}</span> ${({ open: '登録', close: '閉店', move: '移転', rename: '改称', verify: '確認', update: '更新' })[ev.eventType]}
      <span class="text-xs text-slate-500">${ev.after ? JSON.stringify(ev.after) : ''}</span></li>`)}</ul>`);
}

const officialLink = (s: Store) => s.officialUrl ? html`<a class="text-xs text-sky-700 underline" href="${s.officialUrl}" target="_blank" rel="noopener noreferrer">公式ページ</a>` : '';
const infoBtn = (s: Store) => html`<button type="button" class="text-xs text-slate-500 underline" data-store-info="${s.id}">店舗情報</button>`;

function storeRow(s: Store, x: StoreSummary): Raw {
  return html`<tr class="cursor-pointer border-t border-slate-100 hover:bg-amber-50/40" data-store="${s.id}" data-testid="store-row">
    <td class="p-2"><div class="font-medium">${s.name}</div><div class="text-[11px] text-slate-500">${s.brandType}（${BRAND_GROUP_LABEL[s.brandGroup]}）</div></td>
    <td class="p-2 text-xs">${s.address}</td>
    <td class="p-2"><span class="rounded px-1.5 py-0.5 text-[11px] ${statusClass(s.status)}">${s.status}</span></td>
    <td class="p-2 text-right tabular-nums"><b class="${x.profitableInStock ? 'text-emerald-700' : 'text-slate-400'}">${x.profitableInStock}</b> ／ ${x.profitable}
      ${x.profitableStale ? html`<div class="text-[11px] font-semibold text-orange-700" data-testid="store-stale">要再確認 ${x.profitableStale}</div>` : ''}
      ${x.profitableUnconfirmed ? html`<div class="text-[11px] text-amber-700">未確認 ${x.profitableUnconfirmed}</div>` : ''}</td>
    <td class="p-2 text-right tabular-nums ${x.premiumBoth ? 'font-bold text-rose-700' : 'text-slate-400'}">${x.premiumBoth}</td>
    <td class="p-2 text-right font-semibold tabular-nums ${x.profitSumInStock > 0 ? 'text-emerald-600' : 'text-slate-400'}" data-testid="store-profit">${x.profitSumInStock > 0 ? signedYen(x.profitSumInStock) : '¥0'}</td>
    <td class="p-2 text-xs text-slate-500 whitespace-nowrap">${jstDateTime(x.lastCheckedAt)}</td>
    <td class="p-2 whitespace-nowrap"><span class="text-xs font-semibold text-sky-700">商品を見る →</span><div class="mt-1 flex gap-2">${infoBtn(s)}${officialLink(s)}</div></td></tr>`;
}

function storeCard(s: Store, x: StoreSummary): Raw {
  return html`<div class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50" data-store="${s.id}" data-testid="store-card">
    <div class="flex items-start justify-between gap-2"><div class="font-medium">${s.name}</div>
      <span class="rounded px-1.5 py-0.5 text-[11px] ${statusClass(s.status)}">${s.status}</span></div>
    <div class="text-xs text-slate-500">${s.address}</div>
    <div class="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
      <div class="rounded bg-emerald-50 p-2"><div class="text-[11px] text-slate-500">利益商品</div><div class="font-bold tabular-nums">${x.profitableInStock}<span class="text-xs font-normal text-slate-500">／${x.profitable}</span></div><div class="text-[10px] text-slate-500">確認済／全件</div>${x.profitableStale ? html`<div class="text-[10px] font-semibold text-orange-700">要再確認 ${x.profitableStale}</div>` : ''}</div>
      <div class="rounded bg-rose-50 p-2"><div class="text-[11px] text-slate-500">両方定価超え</div><div class="font-bold tabular-nums">${x.premiumBoth}</div></div>
      <div class="rounded bg-slate-50 p-2"><div class="text-[11px] text-slate-500">想定利益合計</div><div class="font-bold tabular-nums ${x.profitSumInStock > 0 ? 'text-emerald-600' : 'text-slate-400'}">${x.profitSumInStock > 0 ? signedYen(x.profitSumInStock) : '¥0'}</div></div>
    </div>
    <div class="mt-2 flex items-center justify-between text-xs"><span class="text-slate-400">最終在庫確認 ${jstDateTime(x.lastCheckedAt)}</span>
      <span class="flex gap-3">${infoBtn(s)}<span class="font-semibold text-sky-700">商品を見る →</span></span></div></div>`;
}

// ---------------- 取込・出力 ----------------
const IMPORTS: { kind: 'products' | 'market' | 'stores'; title: string; desc: Raw }[] = [
  { kind: 'products', title: 'BOOKOFF 商品・在庫・価格', desc: html`列：商品名, JAN, ISBN, カテゴリ, 定価, 画像URL, 店舗ID（shop番号）または店舗名, BOOKOFF価格, 在庫状態, 商品状態, 在庫確認日時, 情報取得元。<br>在庫確認日時が空の行は「在庫未確認」として登録します。` },
  { kind: 'market', title: '販売相場（メルカリ・Yahoo!フリマ・Amazon中古）', desc: html`列：商品名, JAN, ISBN, 販路（メルカリ／Yahoo!フリマ／Amazon中古）, 価格種別（出品価格／売却済み価格／推定相場）, 価格, サンプル数, 取得日時, 情報取得元, 備考。<br>Yahoo!オークション・Yahoo!ショッピングの行は拒否します。` },
  { kind: 'stores', title: '店舗マスタ（閉店・移転・改称の反映）', desc: html`列：公式店舗ID, 店舗名, 都道府県, 所在地, 店舗種別, 公式URL, 状態（営業中／閉店／移転／改称／要確認）, 後継店舗ID, 確認日時, 備考。<br>静岡県・山梨県・神奈川県以外は拒否します。` },
];

function resultView(r: ImportResult & { estimates?: EstimateResult }, encoding: string): Raw {
  return html`<div class="mt-3 rounded-lg ${r.errors.length ? 'bg-amber-50' : 'bg-emerald-50'} p-3 text-sm" data-testid="import-result">
    <div>${r.total}行を処理（${encoding}）：追加 <b>${r.inserted}</b>・更新 <b>${r.updated}</b>・スキップ <b>${r.skipped}</b>・エラー <b>${r.errors.length}</b></div>
    ${r.estimates ? html`<div class="mt-1 text-xs text-slate-600" data-testid="import-estimates">売却済み価格から推定相場を自動算出：${r.estimates.saved}件（直近${r.estimates.days}日の中央値）</div>` : ''}
    ${r.errors.length ? html`<ul class="mt-2 max-h-48 list-disc overflow-auto pl-5 text-xs text-red-700">${r.errors.map((e) => html`<li>${e.line}行目：${e.message}</li>`)}</ul>` : ''}</div>`;
}

function storeDiffView(d: StoreDiff): Raw {
  const r = d.result;
  const fmt = (o: Record<string, unknown> | null | undefined) => o ? Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => `${({ name: '店舗名', address: '所在地', status: '状態' } as Record<string, string>)[k] ?? k}：${v}`).join('、') : '';
  return html`<div class="mt-2 rounded-lg border border-slate-200 bg-white p-3" data-testid="store-diff">
    <div class="text-sm">${r.total}行を照合：追加 <b>${d.changes.filter((c) => c.action === 'inserted').length}</b>・変更 <b>${d.changes.filter((c) => c.action === 'updated').length}</b>・変更なし ${r.skipped - r.errors.length}・エラー ${r.errors.length}・<span class="text-orange-700">CSVに無い営業中の店舗 <b>${d.missing.length}</b></span>（まだ保存していません）</div>
    ${d.changes.length ? html`<ul class="mt-2 max-h-48 list-disc overflow-auto pl-5 text-xs">${d.changes.map((c) => html`<li>${c.line}行目 ${c.action === 'inserted' ? '【追加】' : '【変更】'}${c.officialId ?? ''} ${c.name}${c.action === 'updated' ? html`：${fmt(c.before)} → ${fmt(c.after)}` : ''}</li>`)}</ul>` : ''}
    ${d.missing.length ? html`<div class="mt-2 text-xs font-semibold text-orange-700">CSVに無い店舗（閉店なら「状態」を閉店にした行をCSVに加えて取り込む）</div>
      <ul class="max-h-48 list-disc overflow-auto pl-5 text-xs" data-testid="store-diff-missing">${d.missing.map((m) => html`<li>${m.officialId ?? ''} ${m.name}（${m.prefecture}）</li>`)}</ul>` : ''}
    ${r.errors.length ? html`<ul class="mt-2 list-disc pl-5 text-xs text-red-700">${r.errors.map((e) => html`<li>${e.line}行目：${e.message}</li>`)}</ul>` : ''}</div>`;
}

function dupsView(groups: DuplicateGroup[]): Raw {
  if (!groups.length) return html`<p class="text-sm text-emerald-700" data-testid="dups-empty">重複している商品はありません。</p>`;
  return html`<div class="space-y-3">${groups.map((g) => {
    // 在庫・相場が多い商品（同数なら古い商品）を統合先の候補にする
    const sorted = [...g.products].sort((a, b) => (b.offers + b.prices) - (a.offers + a.prices) || a.createdAt.localeCompare(b.createdAt));
    return html`<div class="rounded-lg border border-slate-200 p-3 text-sm" data-testid="dup-group">
      <div class="mb-1 text-xs text-slate-500">コード ${g.code}${g.isDemo ? '（デモ）' : ''}</div>
      <ul class="space-y-1">${sorted.map((p) => html`<li class="flex flex-wrap items-center gap-2">
        <button type="button" class="text-left underline" data-detail="${p.id}">ID ${p.id}：${p.name}</button><span class="text-xs text-slate-500">在庫${p.offers}・相場${p.prices}</span>
        <button class="btn-secondary !py-0.5 text-xs" data-merge="${p.id}" data-others="${sorted.filter((x) => x.id !== p.id).map((x) => x.id).join(',')}">この商品に統合</button></li>`)}</ul></div>`;
  })}</div>`;
}

export function renderImport(root: HTMLElement, meta: Meta, onDataChange: (reload?: boolean) => void) {
  mount(root, html`<div class="grid gap-4 lg:grid-cols-2">
    ${IMPORTS.map((i) => card(i.title, html`<p class="text-xs leading-relaxed text-slate-600">${i.desc}</p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" accept=".csv,text/csv" data-import="${i.kind}" class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white" aria-label="${i.title} CSVファイル">
        <a class="text-sm text-sky-700 underline" href="/api/templates/${i.kind}.csv">テンプレートCSV</a></div>
      ${i.kind === 'stores' ? html`<div class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <b>定期見直し：</b>公式の店舗一覧から作ったCSVを「差分だけ確認」で照合すると、保存せずに追加・変更される店舗と、CSVに無い営業中の店舗（閉店・改称の候補）を表示します。確認してから上の欄で取り込んでください。
        <label class="mt-2 block"><span class="lbl">差分だけ確認（保存しません）</span>
        <input type="file" accept=".csv,text/csv" id="store-diff" class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-600 file:px-3 file:py-2 file:text-white" aria-label="店舗マスタ 差分確認CSVファイル"></label>
        <div id="store-diff-result"></div></div>` : ''}
      <div data-result="${i.kind}"></div>`))}
    ${card('重複商品の統合', html`<p class="text-sm text-slate-600">JAN・ISBNが同じ商品（書籍はISBN-13とJANを同一視、ISBN-10も変換して比較）を表示します。統合すると在庫・相場を1つの商品にまとめ、空欄の項目を補います。同じ店舗の在庫は確認日時が新しい方を残します。</p>
      <div class="mt-3" id="dups" data-testid="dups"></div>`)}
    ${card('CSVエクスポート', html`<p class="text-sm text-slate-600">一覧画面の現在の絞り込み条件で出力するには、一覧の「CSVエクスポート」を使います。ここからは全件を出力します（Excelで開けるBOM付きUTF-8）。</p>
      <div class="mt-3 flex flex-wrap gap-2"><a class="btn-secondary" href="/api/export.csv">全件をCSVで出力</a>
      <a class="btn-secondary" href="/api/export.csv?dataKind=real">実データのみ出力</a></div>`)}
    ${card('デモデータ', html`<p class="text-sm text-slate-600">現在のデモ：商品 ${meta.counts.demo.products}件・在庫 ${meta.counts.demo.offers}件・相場 ${meta.counts.demo.prices}件。デモは架空の価格で、一覧では「デモ」バッジが付きます。</p>
      <div class="mt-3 flex gap-2"><button class="btn-secondary" id="demo-add">デモを投入</button><button class="btn-danger" id="demo-del">デモを全削除</button></div>`)}
  </div>`);
  $$<HTMLInputElement>('[data-import]', root).forEach((input) => input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const kind = input.dataset.import as 'products' | 'market' | 'stores';
    const { text, encoding } = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
    try {
      const r = await api.importCsv(kind, text, file.name);
      mount($(`[data-result="${kind}"]`, root)!, resultView(r, encoding === 'utf-8' ? 'UTF-8' : 'Shift_JIS'));
      toast('取り込みが完了しました');
      onDataChange();
    } catch (e) { toast((e as Error).message, 'error'); }
    input.value = '';
  }));
  $<HTMLInputElement>('#store-diff', root)!.addEventListener('change', async (ev) => {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const { text } = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
    try { mount($('#store-diff-result', root)!, storeDiffView(await api.diffStores(text, file.name))); }
    catch (e) { toast((e as Error).message, 'error'); }
    input.value = '';
  });
  const loadDups = async () => {
    const el = $('#dups', root)!;
    const { groups } = await api.duplicates();
    mount(el, dupsView(groups));
  };
  $('#dups', root)!.addEventListener('click', async (e) => {
    const d = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-detail]');
    if (d) { openDetail(Number(d.dataset.detail), meta, () => { loadDups(); }); return; }
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-merge]');
    if (!b) return;
    const keepId = Number(b.dataset.merge);
    const mergeIds = (b.dataset.others ?? '').split(',').map(Number).filter(Boolean);
    if (!confirm(`商品ID ${mergeIds.join('・')} を ID ${keepId} に統合します。元に戻せません。よろしいですか？`)) return;
    try { await api.mergeProducts(keepId, mergeIds); toast('統合しました'); onDataChange(); await loadDups(); }
    catch (err) { toast((err as Error).message, 'error'); }
  });
  loadDups().catch((e) => toast((e as Error).message, 'error'));
  $('#demo-add', root)!.addEventListener('click', async () => { await api.seedDemo(); toast('デモデータを投入しました'); onDataChange(true); });
  $('#demo-del', root)!.addEventListener('click', async () => {
    if (!confirm('デモデータ（架空の商品・在庫・相場）をすべて削除します。実データは削除されません。よろしいですか？')) return;
    await api.deleteDemo(); toast('デモデータを削除しました'); onDataChange(true);
  });
}

// ---------------- 設定 ----------------
export async function renderSettings(root: HTMLElement) {
  const s = await api.settings();
  const mpBlock = (m: Marketplace) => html`<fieldset class="rounded-lg border border-slate-200 p-3"><legend class="px-1 font-semibold">${MARKETPLACE_LABEL[m]}</legend>
    <div class="grid grid-cols-2 gap-2">
      <label><span class="lbl">販売手数料率（%）</span><input class="inp" name="${m}.fee" type="number" min="0" max="100" step="0.01" required value="${s.marketplaces[m].feeRatePercent}"></label>
      <label><span class="lbl">送料（円）</span><input class="inp" name="${m}.ship" type="number" min="0" step="1" required value="${s.marketplaces[m].shipping}"></label>
    </div>
    ${m === 'amazon_used' ? html`<details class="mt-3" open><summary class="cursor-pointer text-sm font-medium">カテゴリー別の手数料（空欄＝基本料率）</summary>
      <div class="mt-2 overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-xs text-slate-500"><tr><th class="p-1">カテゴリー</th><th class="p-1">料率%</th><th class="p-1">成約料（円）</th><th class="p-1">最低手数料（円）</th></tr></thead>
      <tbody>${CATEGORIES.map((c) => { const cf = s.marketplaces.amazon_used.categoryFees?.[c] ?? {}; return html`<tr><td class="p-1 whitespace-nowrap">${c}</td>
        <td class="p-1"><input class="inp !py-1" name="amz.${c}.rate" type="number" min="0" max="100" step="0.1" value="${cf.feeRatePercent ?? ''}" aria-label="${c} 料率"></td>
        <td class="p-1"><input class="inp !py-1" name="amz.${c}.fixed" type="number" min="0" step="1" value="${cf.fixedFee ?? ''}" aria-label="${c} 成約料"></td>
        <td class="p-1"><input class="inp !py-1" name="amz.${c}.min" type="number" min="0" step="1" value="${cf.minFee ?? ''}" aria-label="${c} 最低手数料"></td></tr>`; })}</tbody></table></div>
      <p class="mt-1 text-xs text-slate-500">初期値：メディア（本・CD・DVD）15%・最低手数料なし＋成約料（本80円、CD・DVD140円）。その他は保守的に15%・最低30円（家電は実際8〜10%のことが多いので要調整）。</p></details>` : ''}
    </fieldset>`;
  const prio = (i: number) => html`<select class="inp" name="prio${i}" aria-label="優先順位${i + 1}">${options(['estimate', 'sold', 'listing'], s.priceTypePriority[i], PRICE_TYPE_LABEL, i === 0 ? undefined : '（使わない）')}</select>`;
  mount(root, html`<form id="settings-form" class="grid gap-4 lg:grid-cols-2">
    ${card('販路別の手数料・送料', html`<div class="space-y-3">${MARKETPLACES.map(mpBlock)}</div>
      <p class="mt-2 text-xs text-slate-500">初期値はメルカリ10%・Yahoo!フリマ5%・Amazon中古15%（2026年11月時点の公開情報）。送料は自己発送の想定値です。FBAを使う場合は配送代行手数料を送料に入れてください。</p>`)}
    ${card('共通費用・計算方法', html`<div class="space-y-3">
      <label class="block"><span class="lbl">その他費用（円／1点）</span><input class="inp" name="other" type="number" min="0" step="1" value="${s.otherCost}"></label>
      <div><span class="lbl">想定販売価格に使う相場の優先順位</span><div class="grid grid-cols-3 gap-2">${prio(0)}${prio(1)}${prio(2)}</div></div>
      <label class="block"><span class="lbl">在庫確認の有効日数（これを過ぎた「在庫あり」は「要再確認」。0で無効）</span>
        <input class="inp" name="stockFreshDays" type="number" min="0" max="365" step="1" value="${s.stockFreshDays}"></label>
      <label class="block"><span class="lbl">推定相場の自動算出：売却済み価格の期間（直近N日の中央値。0で自動算出しない）</span>
        <input class="inp" name="estimateDays" type="number" min="0" max="3650" step="1" value="${s.estimateDays}"></label>
      <label class="block"><span class="lbl">手数料の端数処理</span><select class="inp" name="rounding">${options(['floor', 'round', 'ceil'], s.rounding, { floor: '切り捨て', round: '四捨五入', ceil: '切り上げ' })}</select></label>
      <div class="rounded-lg bg-slate-50 p-3 text-sm" id="preview"></div>
      <button class="btn-primary w-full">設定を保存</button>
      <button type="button" class="btn-secondary w-full" id="recompute">推定相場を今すぐ再計算</button></div>`)}
  </form>`);
  const form = $<HTMLFormElement>('#settings-form', root)!;
  const read = (): Settings => {
    const fd = new FormData(form);
    const n = (k: string) => Number(fd.get(k));
    const prioList = [0, 1, 2].map((i) => String(fd.get(`prio${i}`) ?? '')).filter(Boolean) as PriceType[];
    const opt = (k: string) => { const v = String(fd.get(k) ?? '').trim(); return v === '' ? undefined : Number(v); };
    const amzFees: Partial<Record<Category, CategoryFee>> = {};
    for (const c of CATEGORIES) {
      const cf: CategoryFee = { feeRatePercent: opt(`amz.${c}.rate`), fixedFee: opt(`amz.${c}.fixed`), minFee: opt(`amz.${c}.min`) };
      (Object.keys(cf) as (keyof CategoryFee)[]).forEach((k) => cf[k] === undefined && delete cf[k]);
      if (Object.keys(cf).length) amzFees[c] = cf;
    }
    const mpCost = (m: Marketplace) => ({ ...s.marketplaces[m], feeRatePercent: n(`${m}.fee`), shipping: n(`${m}.ship`) });
    return {
      marketplaces: { mercari: mpCost('mercari'), yahoo_fleamarket: mpCost('yahoo_fleamarket'), amazon_used: { ...mpCost('amazon_used'), categoryFees: amzFees } },
      stockFreshDays: n('stockFreshDays'),
      estimateDays: n('estimateDays'),
      otherCost: n('other'), priceTypePriority: [...new Set(prioList)] as PriceType[], rounding: fd.get('rounding') as Settings['rounding'],
    };
  };
  const preview = () => {
    const v = read();
    const ex = (m: Marketplace) => {
      const t = feeTerms(v.marketplaces[m], '本');
      const p = calcProfit({ salePrice: 2000, purchasePrice: 500, ...t, shipping: v.marketplaces[m].shipping, otherCost: v.otherCost, rounding: v.rounding });
      return html`<div>${MARKETPLACE_LABEL[m]}：手数料 ${yen(p?.fee)}、利益 <b class="${(p?.profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}">${yen(p?.profit)}</b>（${p?.marginPercent ?? NA}%）</div>`;
    };
    mount($('#preview', root)!, html`<div class="mb-1 text-xs text-slate-500">計算例：本を¥500で仕入れ、¥2,000で販売</div>${MARKETPLACES.map(ex)}`);
  };
  form.addEventListener('input', preview);
  $('#recompute', root)!.addEventListener('click', async () => {
    try { const r = await api.recomputeEstimates(); toast(`推定相場を${r.saved}件算出しました（直近${r.days}日の売却済み価格の中央値・実データのみ）`); }
    catch (err) { toast((err as Error).message, 'error'); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api.saveSettings(read()); toast('設定を保存しました。利益は再計算されます'); } catch (err) { toast((err as Error).message, 'error'); }
  });
  preview();
}

// ---------------- データ取得元 ----------------
export async function renderSources(root: HTMLElement) {
  const { providers } = await api.providers();
  const badge = (st: string, configured?: boolean, method?: string) => st === 'implemented' && method === 'api' && !configured
    ? html`<span class="whitespace-nowrap rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">実装済み・要APIキー</span>`
    : st === 'implemented'
    ? html`<span class="whitespace-nowrap rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">実装済み</span>`
    : html`<span class="whitespace-nowrap rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">未実装</span>`;
  const methodLabel: Record<string, string> = { csv: 'CSV取込', manual: '手動登録', api: '自動取得', snapshot: '公式一覧の記録' };
  mount(root, html`
    <div class="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <b>自動取得について：</b>Amazon中古価格は Keepa API（有料）のAPIキーを設定すると自動取得できます（本番APIでの動作確認は未実施）。メルカリ・Yahoo!フリマ・BOOKOFF店舗在庫の自動取得は<b>未実装</b>です。公式に利用できるAPIが確認できず、規約に反するスクレイピングや認証・アクセス制限の回避は行わないためです。これらはCSV取込または手動登録で入力してください。
    </div>
    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table class="w-full text-sm" data-testid="providers-table">
      <thead class="bg-slate-50 text-left text-xs text-slate-600"><tr><th class="p-2">取得元</th><th class="p-2">方式</th><th class="p-2">状態</th><th class="p-2">補足</th><th class="p-2"></th></tr></thead>
      <tbody>${providers.map((p) => html`<tr class="border-t border-slate-100 align-top"><td class="p-2 font-medium">${p.label}</td><td class="p-2">${methodLabel[p.method]}</td>
        <td class="p-2">${badge(p.status, p.configured, p.method)}</td><td class="p-2 text-xs text-slate-600">${p.reason ?? ''}</td>
        <td class="p-2">${p.bulk && p.configured ? html`<button class="btn-primary whitespace-nowrap !py-1 text-xs" data-bulk="${p.id}">一括取得</button>`
          : p.method === 'api' && p.status === 'not_implemented' ? html`<button class="btn-secondary whitespace-nowrap !py-1 text-xs" data-run="${p.id}">取得を試す</button>` : ''}</td></tr>`)}</tbody></table></div>
    <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div class="mb-1 font-semibold">Amazon中古価格を自動取得する設定</div>
      <ol class="list-decimal space-y-1 pl-5 text-slate-700"><li>Keepa（keepa.com）でAPIの有料プランに登録し、APIキーを取得する</li>
      <li>起動時に環境変数を付ける：<code class="rounded bg-slate-100 px-1">KEEPA_API_KEY=取得したキー npm start</code></li>
      <li>一覧の「Amazon中古価格を更新」またはこの画面の「一括取得」を押す（JAN/ISBNのある実データ商品が対象）</li></ol>
      <p class="mt-2 text-xs text-slate-500">APIキーは画面やDBには保存せず、サーバーの環境変数だけで扱います。</p></div>
    <p class="mt-3 text-xs text-slate-500">詳しい調査結果は docs/data-sources.md を参照。Providerを実装すると、この画面の状態が自動で切り替わります。</p>`);
  root.addEventListener('click', async (e) => {
    const bulk = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-bulk]');
    if (bulk) {
      bulk.disabled = true;
      try { const r = await api.runBulk(bulk.dataset.bulk!); toast(`${r.requested}件を照会、${r.matched}件取得、相場${r.inserted}件・定価${r.listPricesSet}件を保存`); }
      catch (err) { toast((err as Error).message, 'error'); }
      bulk.disabled = false;
      return;
    }
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-run]');
    if (!b) return;
    try { await api.runProvider(b.dataset.run!); toast('取得しました'); } catch (err) { toast((err as Error).message, 'error'); }
  });
}
