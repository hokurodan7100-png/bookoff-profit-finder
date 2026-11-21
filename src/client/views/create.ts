import { api, type Meta } from '../api.ts';
import { $, html, options, toast } from '../dom.ts';
import { openDetail, openDialog } from './detail.ts';

export function openCreateProduct(meta: Meta, onChange: () => void) {
  const d = openDialog('商品を手動登録', html`<form id="create-form" class="space-y-3">
    <label class="block"><span class="lbl">商品名 *</span><input class="inp" name="name" required maxlength="300"></label>
    <div class="grid grid-cols-2 gap-2">
      <label><span class="lbl">JAN（8/13桁）</span><input class="inp" name="jan" inputmode="numeric" pattern="\\d{8}|\\d{13}"></label>
      <label><span class="lbl">ISBN（10/13桁）</span><input class="inp" name="isbn" inputmode="numeric" pattern="\\d{9}[\\dXx]|\\d{13}"></label>
      <label><span class="lbl">カテゴリ *</span><select class="inp" name="category">${options(meta.categories, '本')}</select></label>
      <label><span class="lbl">定価（税込・円）</span><input class="inp" name="listPrice" type="number" min="1" inputmode="numeric"></label>
      <label><span class="lbl">画像URL</span><input class="inp" name="imageUrl" type="url"></label>
      <label><span class="lbl">送料（個別・円）</span><input class="inp" name="shippingOverride" type="number" min="0" placeholder="空欄=設定値"></label>
      <label><span class="lbl">その他費用（個別・円）</span><input class="inp" name="otherCostOverride" type="number" min="0" placeholder="空欄=設定値"></label>
    </div>
    <p class="text-xs text-slate-500">登録後に開く詳細画面で、在庫・BOOKOFF価格と相場を追加できます。</p>
    <button class="btn-primary w-full">登録して詳細を開く</button></form>`, 'create-dialog');
  $<HTMLFormElement>('#create-form', d)!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const n = (k: string) => (fd.get(k) ? Number(fd.get(k)) : null);
    try {
      const p = await api.createProduct({ name: String(fd.get('name')), jan: String(fd.get('jan') ?? ''), isbn: String(fd.get('isbn') ?? ''),
        category: String(fd.get('category')), imageUrl: String(fd.get('imageUrl') ?? ''), shippingOverride: n('shippingOverride'), otherCostOverride: n('otherCostOverride'), listPrice: n('listPrice') });
      d.close();
      toast('商品を登録しました');
      onChange();
      openDetail(p.id, meta, onChange);
    } catch (err) { toast((err as Error).message, 'error'); }
  });
}
