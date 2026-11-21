import { api, type Meta } from '../api.ts';
import { $, $$, html, mount, toast, type Raw } from '../dom.ts';
import { NA } from '../../shared/constants.ts';
import { yen } from '../../shared/format.ts';
import type { ItemRow } from '../../shared/types.ts';
import { demoBadge, premiumBadge, stockChip } from './list.ts';

/** 各アプリの検索ページ（利用者が自分で開いて「売り切れ」で絞り込む） */
const mercariSearch = (q: string) => `https://jp.mercari.com/search?keyword=${encodeURIComponent(q)}`;
const yahooSearch = (q: string) => `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(q)}`;

const nowLocal = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 16);

function card(r: ItemRow): Raw {
  const p = r.premium;
  const q = r.product.name;
  return html`<article class="rounded-xl border border-slate-200 bg-white p-4" data-testid="check-card" data-product="${r.product.id}">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><h3 class="font-medium leading-snug">${r.product.name}</h3>
        <div class="mt-1 text-xs text-slate-500">${r.product.category}・${r.product.jan ? `JAN ${r.product.jan}` : r.product.isbn ? `ISBN ${r.product.isbn}` : 'JAN/ISBN 未取得'}</div></div>
      ${r.isDemo ? demoBadge() : ''}
    </div>
    <div class="mt-2">${premiumBadge(r)}</div>
    <dl class="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
      <div class="rounded bg-slate-50 p-2"><dt class="text-[11px] text-slate-500">定価</dt><dd class="font-semibold tabular-nums">${yen(p.listPrice)}</dd></div>
      <div class="rounded bg-slate-50 p-2"><dt class="text-[11px] text-slate-500">Amazon中古</dt><dd class="font-semibold tabular-nums">${yen(p.amazonPrice)}</dd></div>
      <div class="rounded bg-amber-50 p-2"><dt class="text-[11px] text-slate-500">BOOKOFF</dt><dd class="font-semibold tabular-nums">${yen(r.offer?.price)}</dd></div>
    </dl>
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>${r.store?.name ?? `店舗${NA}`}</span>${stockChip(r.stock.status, r.stock.ageDays)}</div>
    <div class="mt-3 flex flex-wrap gap-2">
      <a class="btn-secondary !py-1.5 text-xs" href="${mercariSearch(q)}" target="_blank" rel="noopener noreferrer">メルカリで探す ↗</a>
      <a class="btn-secondary !py-1.5 text-xs" href="${yahooSearch(q)}" target="_blank" rel="noopener noreferrer">Yahoo!フリマで探す ↗</a>
    </div>
    <form class="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[auto_1fr_6rem_auto]" data-flea-form>
      <label><span class="lbl">販路</span><select class="inp" name="marketplace"><option value="yahoo_fleamarket">Yahoo!フリマ</option><option value="mercari">メルカリ</option></select></label>
      <label><span class="lbl">売れた価格（円）</span><input class="inp" name="price" type="number" min="1" required inputmode="numeric" placeholder="例：1800"></label>
      <label><span class="lbl">見た件数</span><input class="inp" name="sampleCount" type="number" min="1" inputmode="numeric" placeholder="例：5"></label>
      <div class="flex items-end"><button class="btn-primary w-full">登録</button></div>
    </form>
  </article>`;
}

export async function renderCheck(root: HTMLElement, _meta: Meta) {
  const params = new URLSearchParams({ needsFleaCheck: '1', profitOnly: '0', sort: 'premium_desc', limit: '200' });
  const { rows } = await api.items(params);
  mount(root, html`
    <div class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <div class="font-semibold">フリマで売れた価格の確認待ち：${rows.length}件</div>
      <p class="mt-1">Amazon中古では定価を超えていて、BOOKOFFでは定価以下で買える商品のうち、フリマの売却済み価格がまだ無いものです。
      「メルカリで探す」「Yahoo!フリマで探す」で検索を開き、<b>「売り切れ」に絞り込んで</b>直近数件の真ん中くらいの価格を登録してください。
      登録すると、両方で定価を超えた商品は一覧の「プレミア商品を探す」に表示されます。</p>
    </div>
    ${rows.length ? html`<div class="grid gap-3 lg:grid-cols-2" id="check-list">${rows.map(card)}</div>`
      : html`<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">確認待ちの商品はありません。
        <br>Amazon中古の価格と定価が入ると、ここに候補が出ます（データ取得元画面の「一括取得」かCSVで登録）。</div>`}`);

  $$<HTMLFormElement>('[data-flea-form]', root).forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cardEl = form.closest<HTMLElement>('[data-product]')!;
    const productId = Number(cardEl.dataset.product);
    const fd = new FormData(form);
    const price = Number(fd.get('price'));
    try {
      await api.addPrice({ productId, marketplace: fd.get('marketplace'), priceType: 'sold', price,
        sampleCount: fd.get('sampleCount') ? Number(fd.get('sampleCount')) : null, observedAt: nowLocal(), note: '確認待ち画面から登録' });
      const after = await api.items(new URLSearchParams({ q: '', profitOnly: '0', bothOver: '1', limit: '2000' }));
      const ok = after.rows.some((r) => r.product.id === productId);
      toast(ok ? '登録しました：両方で定価超えです。プレミア商品の一覧に表示されます' : '登録しました：フリマでは定価以下でした。候補から外れます');
      cardEl.remove();
      const left = $$('[data-testid=check-card]', root).length;
      const head = $('.font-semibold', root);
      if (head) head.textContent = `フリマで売れた価格の確認待ち：${left}件`;
    } catch (err) { toast((err as Error).message, 'error'); }
  }));
}
