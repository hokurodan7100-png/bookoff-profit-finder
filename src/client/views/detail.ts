import { api, type Meta } from '../api.ts';
import { $, html, mount, options, toast, type Raw } from '../dom.ts';
import { jstDateTime, percent, signedYen, yen } from '../../shared/format.ts';
import { MARKETPLACE_LABEL, MARKETPLACES, NA, PRICE_TYPE_LABEL, type Marketplace } from '../../shared/constants.ts';
import { feeTerms, summarizeMarkets } from '../../shared/profit.ts';
import { effectiveStock } from '../../shared/stock.ts';
import { demoBadge, profitClass, stockChip } from './list.ts';

export function openDialog(title: string, body: Raw, testId = 'dialog'): HTMLDialogElement {
  const d = document.createElement('dialog');
  d.className = 'm-auto w-[min(56rem,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50';
  d.dataset.testid = testId;
  mount(d, html`<div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <h2 class="font-semibold">${title}</h2>
      <button class="rounded p-1 text-slate-500 hover:bg-slate-100" data-close aria-label="閉じる">✕</button></div>
    <div class="p-4" data-body>${body}</div>`);
  d.addEventListener('click', (e) => { if (e.target === d || (e.target as HTMLElement).closest('[data-close]')) d.close(); });
  d.addEventListener('close', () => d.remove());
  document.body.appendChild(d);
  d.showModal();
  return d;
}

const nowLocal = () => {
  const d = new Date(Date.now() + 9 * 3600000);
  return d.toISOString().slice(0, 16);
};

export async function openDetail(productId: number, meta: Meta, onChange: () => void) {
  const d = openDialog('商品詳細', html`<p class="text-slate-500">読み込み中…</p>`, 'detail-dialog');
  const body = $('[data-body]', d)!;
  const load = async () => {
    const [{ product, offers, prices }, settings, { stores }] = await Promise.all([api.product(productId), api.settings(), api.stores()]);
    const breakdown = (offerPrice: number | null) => summarizeMarkets({ prices, purchasePrice: offerPrice, settings,
      shippingOverride: product.shippingOverride, otherCostOverride: product.otherCostOverride, category: product.category });
    const firstOffer = offers[0] ?? null;
    const { markets } = breakdown(firstOffer?.price ?? null);
    const calcTable = (m: Marketplace) => {
      const s = markets[m];
      const p = s.profit;
      const t = feeTerms(settings.marketplaces[m], product.category);
      return html`<div class="rounded-lg border border-slate-200 p-3" data-testid="calc-${m}">
        <div class="mb-2 font-semibold">${MARKETPLACE_LABEL[m]}</div>
        ${p ? html`<dl class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
          <dt>想定販売価格（${PRICE_TYPE_LABEL[s.chosen!.priceType]}）</dt><dd class="text-right">${yen(p.salePrice)}</dd>
          <dt>− 仕入れ価格</dt><dd class="text-right">${yen(firstOffer?.price)}</dd>
          <dt>− 販売手数料（${t.feeRatePercent}%${t.minFee ? `・最低${t.minFee}円` : ''}${t.fixedFee ? `＋成約料${t.fixedFee}円` : ''}）</dt><dd class="text-right">${yen(p.fee)}</dd>
          <dt>− 送料</dt><dd class="text-right">${yen(p.shipping)}</dd>
          <dt>− その他費用</dt><dd class="text-right">${yen(p.otherCost)}</dd>
          <dt class="border-t pt-1 font-semibold">想定利益</dt><dd class="border-t pt-1 text-right font-bold ${profitClass(p.profit)}">${signedYen(p.profit)}</dd>
          <dt>利益率 / 投資利益率</dt><dd class="text-right">${percent(p.marginPercent)} / ${percent(p.roiPercent)}</dd></dl>`
        : html`<p class="text-sm text-slate-500">${s.chosen ? '仕入れ価格が未取得のため計算できません' : `相場${NA}のため計算できません`}</p>`}
      </div>`;
    };
    mount(body, html`
      <div class="flex flex-wrap items-start gap-3">
        <div class="ml-auto flex gap-2 order-2"><button type="button" class="btn-secondary !py-1 text-xs" id="edit-product">商品情報を編集</button>
          <button type="button" class="btn-danger !py-1 text-xs" id="delete-product">商品を削除</button></div>
        <div class="min-w-0 flex-1"><h3 class="text-lg font-semibold">${product.name} ${product.isDemo ? demoBadge() : ''}</h3>
          <div class="mt-1 text-sm text-slate-500">${product.category}・JAN ${product.jan ?? NA}・ISBN ${product.isbn ?? NA}・定価 ${yen(product.listPrice)}${product.listPriceSource ? `（${product.listPriceSource}）` : ''}</div>
          <div class="text-xs text-slate-400">情報取得元：${product.source}</div></div>
      </div>
      <div id="edit-wrap" class="hidden"><form id="edit-form" class="mt-3 grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
        <label class="sm:col-span-2"><span class="lbl">商品名</span><input class="inp" name="name" required maxlength="300" value="${product.name}"></label>
        <label><span class="lbl">JAN（8/13桁）</span><input class="inp" name="jan" inputmode="numeric" pattern="\\d{8}|\\d{13}" value="${product.jan ?? ''}"></label>
        <label><span class="lbl">ISBN（10/13桁）</span><input class="inp" name="isbn" value="${product.isbn ?? ''}"></label>
        <label><span class="lbl">カテゴリ</span><select class="inp" name="category">${options(meta.categories, product.category)}</select></label>
        <label><span class="lbl">定価（税込・円）</span><input class="inp" name="listPrice" type="number" min="1" value="${product.listPrice ?? ''}"></label>
        <label><span class="lbl">送料（個別・円）</span><input class="inp" name="shippingOverride" type="number" min="0" placeholder="空欄=設定値" value="${product.shippingOverride ?? ''}"></label>
        <label><span class="lbl">その他費用（個別・円）</span><input class="inp" name="otherCostOverride" type="number" min="0" placeholder="空欄=設定値" value="${product.otherCostOverride ?? ''}"></label>
        <label class="sm:col-span-2"><span class="lbl">画像URL</span><input class="inp" name="imageUrl" type="url" value="${product.imageUrl ?? ''}"></label>
        <div class="flex gap-2 sm:col-span-2"><button class="btn-primary">保存</button><button type="button" class="btn-secondary" id="edit-cancel">やめる</button></div>
      </form></div>
      ${product.isDemo ? html`<p class="mt-2 rounded bg-violet-50 p-2 text-xs text-violet-800">これは架空のデモデータです。価格・在庫は実在しません。</p>` : ''}

      <h4 class="mt-5 mb-2 font-semibold">利益計算（${firstOffer?.store?.name ?? '先頭の在庫'}の価格で計算）</h4>
      <div class="grid gap-3 md:grid-cols-3">${MARKETPLACES.map(calcTable)}</div>

      <h4 class="mt-5 mb-2 font-semibold">在庫・BOOKOFF価格</h4>
      ${offers.length ? html`<ul class="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">${offers.map((o) => html`
        <li class="flex flex-wrap items-center gap-2 p-2"><span class="font-medium">${o.store?.name ?? `店舗${NA}`}</span>
          <span class="tabular-nums">${yen(o.price)}</span>${(() => { const e = effectiveStock(o, settings.stockFreshDays); return stockChip(e.status, e.ageDays); })()}<span class="text-xs text-slate-500">${o.condition}</span>
          <span class="ml-auto text-xs text-slate-400">確認 ${jstDateTime(o.checkedAt)}・${o.source}</span>
          <button type="button" class="rounded px-1.5 text-xs text-red-600 hover:bg-red-50" data-del-offer="${o.id}" aria-label="この在庫情報を削除">削除</button></li>`)}</ul>`
      : html`<p class="text-sm text-slate-500">在庫情報は${NA}です。</p>`}

      <h4 class="mt-5 mb-2 font-semibold">相場の履歴</h4>
      ${prices.length ? html`<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-xs text-slate-500">
        <tr><th class="p-1">販路</th><th class="p-1">種別</th><th class="p-1 text-right">価格</th><th class="p-1 text-right">件数</th><th class="p-1">取得日時</th><th class="p-1">取得元</th><th class="p-1"></th></tr></thead>
        <tbody>${prices.map((p) => html`<tr class="border-t border-slate-100"><td class="p-1">${MARKETPLACE_LABEL[p.marketplace]}</td>
          <td class="p-1">${PRICE_TYPE_LABEL[p.priceType]}</td><td class="p-1 text-right tabular-nums">${yen(p.price)}</td>
          <td class="p-1 text-right">${p.sampleCount ?? NA}</td><td class="p-1 whitespace-nowrap">${jstDateTime(p.observedAt)}</td>
          <td class="p-1 text-xs text-slate-500">${p.source}${p.note ? `（${p.note}）` : ''}</td>
          <td class="p-1"><button type="button" class="rounded px-1.5 text-xs text-red-600 hover:bg-red-50" data-del-price="${p.id}" aria-label="この相場を削除">削除</button></td></tr>`)}</tbody></table></div>`
      : html`<p class="text-sm text-slate-500">相場は${NA}です。</p>`}

      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <form id="price-form" class="space-y-2 rounded-lg bg-slate-50 p-3">
          <div class="font-semibold">相場を手動登録</div>
          <p class="text-xs text-slate-500">各アプリ・Amazonの商品ページで確認した価格を入力します。</p>
          <div class="grid grid-cols-2 gap-2">
            <label><span class="lbl">販路</span><select class="inp" name="marketplace">${options(meta.marketplaces, 'mercari', meta.marketplaceLabel)}</select></label>
            <label><span class="lbl">価格種別</span><select class="inp" name="priceType">${options(meta.priceTypes, 'sold', meta.priceTypeLabel)}</select></label>
            <label><span class="lbl">価格（円）</span><input class="inp" name="price" type="number" min="1" required inputmode="numeric"></label>
            <label><span class="lbl">サンプル数</span><input class="inp" name="sampleCount" type="number" min="0" inputmode="numeric"></label>
          </div>
          <label class="block"><span class="lbl">取得日時</span><input class="inp" name="observedAt" type="datetime-local" required value="${nowLocal()}"></label>
          <label class="block"><span class="lbl">備考</span><input class="inp" name="note" maxlength="300"></label>
          <button class="btn-primary w-full">相場を登録</button>
        </form>
        <form id="offer-form" class="space-y-2 rounded-lg bg-slate-50 p-3">
          <div class="font-semibold">在庫・価格を登録／更新</div>
          <p class="text-xs text-slate-500">同じ店舗の既存情報は上書きされます。確認日時がない場合は「在庫未確認」になります。</p>
          <label class="block"><span class="lbl">店舗</span><select class="inp" name="storeId"><option value="">店舗未指定</option>
            ${meta.prefectures.map((pref) => html`<optgroup label="${pref}">${stores.filter((s) => s.prefecture === pref).map((s) =>
              html`<option value="${s.id}">${s.name}${s.status !== '営業中' ? `（${s.status}）` : ''}</option>`)}</optgroup>`)}</select></label>
          <div class="grid grid-cols-2 gap-2">
            <label><span class="lbl">BOOKOFF価格（円）</span><input class="inp" name="price" type="number" min="0" inputmode="numeric"></label>
            <label><span class="lbl">商品状態</span><select class="inp" name="condition">${options(meta.conditions, '状態未確認')}</select></label>
            <label><span class="lbl">在庫状態</span><select class="inp" name="stockStatus">${options(meta.stockStatuses, '在庫未確認')}</select></label>
            <label><span class="lbl">在庫確認日時</span><input class="inp" name="checkedAt" type="datetime-local"></label>
          </div>
          <button class="btn-primary w-full">在庫を登録</button>
        </form>
      </div>`);

    const editForm = $<HTMLFormElement>('#edit-form', body)!;
    const editWrap = $('#edit-wrap', body)!;
    $('#edit-product', body)!.addEventListener('click', () => editWrap.classList.toggle('hidden'));
    $('#edit-cancel', body)!.addEventListener('click', () => editWrap.classList.add('hidden'));
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(editForm);
      const n = (k: string) => (String(fd.get(k) ?? '').trim() ? Number(fd.get(k)) : null);
      try {
        await api.updateProduct(productId, { name: String(fd.get('name')), jan: String(fd.get('jan') ?? '').trim(), isbn: String(fd.get('isbn') ?? '').trim(),
          category: String(fd.get('category')), imageUrl: String(fd.get('imageUrl') ?? '').trim(), listPrice: n('listPrice'),
          shippingOverride: n('shippingOverride'), otherCostOverride: n('otherCostOverride') });
        toast('商品情報を保存しました'); onChange(); await load();
      } catch (err) { toast((err as Error).message, 'error'); }
    });
    $('#delete-product', body)!.addEventListener('click', async () => {
      if (!confirm(`「${product.name}」と、その在庫・相場の記録をすべて削除します。元に戻せません。よろしいですか？`)) return;
      try { await api.deleteProduct(productId); toast('商品を削除しました'); d.close(); onChange(); } catch (err) { toast((err as Error).message, 'error'); }
    });
    body.querySelectorAll<HTMLButtonElement>('[data-del-offer], [data-del-price]').forEach((b) => b.addEventListener('click', async () => {
      const isOffer = !!b.dataset.delOffer;
      if (!confirm(isOffer ? 'この店舗の在庫・価格の記録を削除しますか？' : 'この相場の記録を削除しますか？')) return;
      try {
        if (isOffer) await api.deleteOffer(Number(b.dataset.delOffer)); else await api.deletePrice(Number(b.dataset.delPrice));
        toast('削除しました'); onChange(); await load();
      } catch (err) { toast((err as Error).message, 'error'); }
    }));
    $<HTMLFormElement>('#price-form', body)!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      try {
        await api.addPrice({ productId, marketplace: fd.get('marketplace'), priceType: fd.get('priceType'), price: Number(fd.get('price')),
          sampleCount: fd.get('sampleCount') ? Number(fd.get('sampleCount')) : null, observedAt: String(fd.get('observedAt')), note: String(fd.get('note') ?? '') });
        toast('相場を登録しました'); onChange(); await load();
      } catch (err) { toast((err as Error).message, 'error'); }
    });
    $<HTMLFormElement>('#offer-form', body)!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      try {
        await api.addOffer({ productId, storeId: fd.get('storeId') ? Number(fd.get('storeId')) : null,
          price: fd.get('price') ? Number(fd.get('price')) : null, condition: String(fd.get('condition')),
          stockStatus: String(fd.get('stockStatus')), checkedAt: String(fd.get('checkedAt') ?? '') });
        toast('在庫を登録しました'); onChange(); await load();
      } catch (err) { toast((err as Error).message, 'error'); }
    });
  };
  try { await load(); } catch (e) { mount(body, html`<p class="text-red-600">${(e as Error).message}</p>`); }
}
