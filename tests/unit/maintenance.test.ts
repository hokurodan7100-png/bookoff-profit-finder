import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../../src/server/db.ts';
import { Repository } from '../../src/server/repository.ts';
import { ensureSettings, seedStores } from '../../src/server/seed.ts';
import { diffStores } from '../../src/server/importers.ts';
import { AUTO_ESTIMATE_SOURCE, buildRows, queryItems, findDuplicates, recomputeEstimates } from '../../src/server/service.ts';
import { isbn10to13, median, productCodes } from '../../src/shared/codes.ts';
import { createHandler } from '../../src/server/api.ts';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

function freshRepo() {
  const repo = new Repository(openDb(':memory:'));
  ensureSettings(repo);
  seedStores(repo);
  return repo;
}
const daysAgo = (n: number, base = Date.now()) => new Date(base - n * 86400000).toISOString();

describe('コードと中央値', () => {
  it('ISBN-10をISBN-13に変換する（チェックディジット含む）', () => {
    assert.equal(isbn10to13('4101010013'), '9784101010014');
    assert.equal(isbn10to13('080442957X'), '9780804429573');
    assert.equal(isbn10to13('12345'), null);
  });
  it('JANとISBNを区別せず13桁に正規化する', () => {
    assert.deepEqual(productCodes({ jan: '9784101010014', isbn: '4101010013' }), ['9784101010014']);
    assert.deepEqual(productCodes({ jan: null, isbn: null }), []);
  });
  it('中央値：奇数・偶数（四捨五入）・空', () => {
    assert.equal(median([300, 100, 200]), 200);
    assert.equal(median([100, 201]), 151);
    assert.equal(median([]), null);
  });
});

describe('推定相場の自動算出', () => {
  it('直近N日の売却済み価格の中央値と件数を保存し、期間外は使わない', () => {
    const repo = freshRepo();
    const now = Date.now();
    const p = repo.insertProduct({ name: 'テスト本', isbn: '9784101010014', category: '本', source: 't' });
    for (const [price, d] of [[1000, 1], [1200, 5], [900, 10], [5000, 40]] as const) {
      repo.insertPrice({ productId: p.id, marketplace: 'mercari', priceType: 'sold', price, observedAt: daysAgo(d, now), source: 't' });
    }
    repo.insertPrice({ productId: p.id, marketplace: 'mercari', priceType: 'listing', price: 9999, observedAt: daysAgo(0, now), source: 't' });
    const r = recomputeEstimates(repo, { now });
    assert.equal(r.saved, 1);
    const est = repo.listPricesForProduct(p.id).filter((x) => x.priceType === 'estimate');
    assert.equal(est.length, 1);
    assert.equal(est[0].price, 1000);
    assert.equal(est[0].sampleCount, 3);
    assert.equal(est[0].source, AUTO_ESTIMATE_SOURCE);
    assert.equal(est[0].observedAt, daysAgo(1, now)); // 最新の売却済み価格の日時
    // 利益計算は推定相場を優先して使う
    assert.equal(buildRows(repo).find((x) => x.product.id === p.id)!.markets.mercari.chosen!.price, 1000);
  });
  it('再計算しても重複せず置き換わる。手動の推定相場は残す。期間を0にすると自動算出分を削除', () => {
    const repo = freshRepo();
    const p = repo.insertProduct({ name: 'テスト', jan: '4900000000010', category: 'ゲーム', source: 't' });
    repo.insertPrice({ productId: p.id, marketplace: 'yahoo_fleamarket', priceType: 'sold', price: 800, observedAt: daysAgo(2), source: 't' });
    repo.insertPrice({ productId: p.id, marketplace: 'yahoo_fleamarket', priceType: 'estimate', price: 777, observedAt: daysAgo(3), source: 'CSV' });
    recomputeEstimates(repo);
    recomputeEstimates(repo);
    const est = () => repo.listPricesForProduct(p.id).filter((x) => x.priceType === 'estimate');
    assert.equal(est().length, 2);
    repo.saveSettings({ ...repo.getSettings()!, estimateDays: 0 });
    const r = recomputeEstimates(repo);
    assert.equal(r.removed, 1);
    assert.deepEqual(est().map((x) => x.price), [777]);
  });
  it('デモデータの相場は対象外', () => {
    const repo = freshRepo();
    const p = repo.insertProduct({ name: 'デモ', jan: '4900000000027', category: 'ゲーム', source: 't', isDemo: true });
    repo.insertPrice({ productId: p.id, marketplace: 'mercari', priceType: 'sold', price: 800, observedAt: daysAgo(1), source: 't', isDemo: true });
    assert.equal(recomputeEstimates(repo).saved, 0);
  });
});

describe('重複商品の統合', () => {
  it('JANとISBN（ISBN-10含む）が一致する商品をまとめる。デモと実データは別', () => {
    const repo = freshRepo();
    const a = repo.insertProduct({ name: 'A', jan: '9784101010014', category: '本', source: 't' });
    const b = repo.insertProduct({ name: 'A（ISBN登録）', isbn: '4101010013', category: '本', source: 't' });
    repo.insertProduct({ name: '別商品', jan: '4900000000010', category: 'ゲーム', source: 't' });
    repo.insertProduct({ name: 'Aのデモ', jan: '9784101010014', category: '本', source: 't', isDemo: true });
    const groups = findDuplicates(repo);
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].products.map((p) => p.id).sort(), [a.id, b.id].sort());
    assert.equal(groups[0].isDemo, false);
  });
  it('在庫・相場を移し、同じ店舗は確認日時が新しい方を残し、空欄を補う', () => {
    const repo = freshRepo();
    const store = repo.findStoreByOfficialId('shop10145')!.id;
    const store2 = repo.findStoreByOfficialId('shop10259')!.id;
    const keep = repo.insertProduct({ name: '残す', jan: '9784101010014', category: '本', source: 't' });
    const drop = repo.insertProduct({ name: '消す', isbn: '9784101010014', category: '本', source: 't', listPrice: 1500 });
    repo.insertOffer({ productId: keep.id, storeId: store, price: 300, stockStatus: '在庫あり（確認済）', checkedAt: daysAgo(5), source: 't' });
    repo.insertOffer({ productId: drop.id, storeId: store, price: 250, stockStatus: '在庫あり（確認済）', checkedAt: daysAgo(1), source: 't' });
    repo.insertOffer({ productId: drop.id, storeId: store2, price: 400, source: 't' });
    const obs = daysAgo(2);
    repo.insertPrice({ productId: keep.id, marketplace: 'mercari', priceType: 'sold', price: 1000, observedAt: obs, source: 't' });
    repo.insertPrice({ productId: drop.id, marketplace: 'mercari', priceType: 'sold', price: 1000, observedAt: obs, source: 't' });
    repo.insertPrice({ productId: drop.id, marketplace: 'yahoo_fleamarket', priceType: 'sold', price: 900, observedAt: obs, source: 't' });
    const merged = repo.mergeProducts(keep.id, [drop.id]);
    assert.equal(repo.getProduct(drop.id), null);
    assert.equal(merged.isbn, '9784101010014');
    assert.equal(merged.listPrice, 1500);
    const offers = repo.listOffersForProduct(keep.id);
    assert.equal(offers.length, 2);
    assert.equal(offers.find((o) => o.storeId === store)!.price, 250);
    assert.equal(repo.listPricesForProduct(keep.id).length, 2);
    assert.equal(findDuplicates(repo).length, 0);
  });
  it('実データとデモは統合しない', () => {
    const repo = freshRepo();
    const a = repo.insertProduct({ name: 'A', jan: '4900000000010', category: 'ゲーム', source: 't' });
    const b = repo.insertProduct({ name: 'B', jan: '4900000000010', category: 'ゲーム', source: 't', isDemo: true });
    assert.throws(() => repo.mergeProducts(a.id, [b.id]), /統合できません/);
    assert.ok(repo.getProduct(b.id));
  });
});

describe('店舗マスタの差分確認', () => {
  it('保存せずに追加・変更・CSVに無い営業中の店舗を返す', () => {
    const repo = freshRepo();
    const before = repo.listStores();
    const keepIds = before.filter((s) => s.officialId !== 'shop10145').map((s) => s.officialId);
    const rows = before.filter((s) => keepIds.includes(s.officialId)).map((s) => [s.officialId, s.name, s.prefecture, s.address].join(','));
    rows[0] = rows[0].replace(/,[^,]+$/, `,${before[0].prefecture}改称後の住所1-1`);
    const csv = ['公式店舗ID,店舗名,都道府県,所在地', ...rows, 'shop99998,BOOKOFF PLUS 新規テスト店,山梨県,山梨県甲府市1-1'].join('\n');
    const d = diffStores(repo, csv, 'diff.csv');
    assert.equal(d.changes.filter((c) => c.action === 'inserted').length, 1);
    assert.equal(d.changes.filter((c) => c.action === 'updated').length, 1);
    assert.deepEqual(d.missing.map((m) => m.officialId), ['shop10145']);
    // 何も保存されていない
    assert.equal(repo.countStores(), 102);
    assert.equal(repo.findStoreByOfficialId('shop99998'), null);
    assert.equal(repo.listStores()[0].address, before[0].address);
  });
});

describe('一覧のキャッシュ', () => {
  it('データや設定を変えると作り直し、変わらなければ同じ結果を再利用する', () => {
    const repo = freshRepo();
    const p = repo.insertProduct({ name: 'キャッシュ', jan: '4900000000010', category: 'ゲーム', source: 't' });
    repo.insertOffer({ productId: p.id, storeId: repo.listStores()[0].id, price: 100, source: 't' });
    const a = queryItems(repo, { profitOnly: false });
    assert.equal(a.total, 1);
    assert.equal(a.rows[0].bestProfit, null);
    repo.insertPrice({ productId: p.id, marketplace: 'mercari', priceType: 'sold', price: 2000, observedAt: daysAgo(1), source: 't' });
    const b = queryItems(repo, { profitOnly: true });
    assert.equal(b.rows.length, 1);
    repo.saveSettings({ ...repo.getSettings()!, otherCost: 5000 });
    assert.equal(queryItems(repo, { profitOnly: true }).rows.length, 0);
  });
});

describe('API', () => {
  it('相場CSVの取込後に推定相場を自動算出し、統合APIで重複をまとめる', async () => {
    const repo = freshRepo();
    const server = createServer(createHandler(repo, 'dist/public', []));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const p = repo.insertProduct({ name: 'API本', isbn: '9784101010014', category: '本', source: 't' });
      const d = new Date(Date.now() + 9 * 3600000 - 86400000).toISOString().slice(0, 16).replace('T', ' ');
      const csv = ['商品名,JAN,ISBN,販路,価格種別,価格,取得日時', `API本,,9784101010014,メルカリ,売却済み価格,1000,${d}`, `API本,,9784101010014,メルカリ,売却済み価格,1400,${d}`].join('\n');
      const r = await (await fetch(`${base}/api/import/market`, { method: 'POST', body: JSON.stringify({ csv, filename: 'm.csv' }) })).json();
      assert.equal(r.inserted, 2);
      assert.equal(r.estimates.saved, 1);
      assert.equal(repo.listPricesForProduct(p.id).find((x) => x.priceType === 'estimate')!.price, 1200);

      const dup = repo.insertProduct({ name: 'API本（重複）', jan: '9784101010014', category: '本', source: 't' });
      const g = await (await fetch(`${base}/api/duplicates`)).json();
      assert.equal(g.groups.length, 1);
      const m = await fetch(`${base}/api/products/merge`, { method: 'POST', body: JSON.stringify({ keepId: p.id, mergeIds: [dup.id] }) });
      assert.equal(m.status, 200);
      assert.equal(repo.getProduct(dup.id), null);
      const bad = await fetch(`${base}/api/products/merge`, { method: 'POST', body: JSON.stringify({ keepId: 99999, mergeIds: [p.id] }) });
      assert.equal(bad.status, 400);
    } finally { server.close(); }
  });
});
