import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { openDb } from '../../src/server/db.ts';
import { Repository } from '../../src/server/repository.ts';
import { ensureSettings, seedStores } from '../../src/server/seed.ts';
import { importMarket, importProducts, importStores, parseJstDate } from '../../src/server/importers.ts';
import { buildRows, summarizeStores } from '../../src/server/service.ts';
import { startServer } from '../../src/server/main.ts';

function freshRepo() {
  const repo = new Repository(openDb(':memory:'));
  ensureSettings(repo);
  seedStores(repo);
  return repo;
}

describe('店舗マスタ', () => {
  it('公式一覧の件数（静岡26・山梨6・神奈川70）を登録し、3県以外を含まない', () => {
    const stores = freshRepo().listStores();
    const by = (p: string) => stores.filter((s) => s.prefecture === p).length;
    assert.equal(by('静岡県'), 26); assert.equal(by('山梨県'), 6); assert.equal(by('神奈川県'), 70);
    assert.ok(stores.every((s) => s.officialUrl?.startsWith('https://www.bookoff.co.jp/shop/shop')));
    assert.ok(stores.some((s) => s.brandType === 'BOOKOFF SUPER BAZAAR'));
    assert.equal(stores.find((s) => s.name.startsWith('aidect'))!.brandGroup, 'related');
  });
  it('再投入しても重複しない', () => {
    const repo = freshRepo();
    assert.equal(seedStores(repo), 0);
    assert.equal(repo.countStores(), 102);
  });
  it('CSVで閉店・後継店舗を反映し履歴が残る。他県は拒否', () => {
    const repo = freshRepo();
    const r = importStores(repo, [
      '公式店舗ID,店舗名,都道府県,所在地,状態,後継店舗ID,確認日時',
      'shop10145,BOOKOFF 富士宮北町店,静岡県,静岡県富士宮市北町21-8,閉店,shop10271,2026-11-20',
      'shop99999,BOOKOFF 東京テスト店,東京都,東京都千代田区1-1,営業中,,',
      'shop99998,BOOKOFF PLUS 新規テスト店,山梨県,山梨県甲府市1-1,営業中,,',
    ].join('\n'), 't.csv');
    assert.equal(r.updated, 1); assert.equal(r.inserted, 1); assert.equal(r.errors.length, 1);
    const s = repo.findStoreByOfficialId('shop10145')!;
    assert.equal(s.status, '閉店');
    assert.equal(s.successorStoreId, repo.findStoreByOfficialId('shop10271')!.id);
    assert.ok(repo.listStoreEvents(s.id).some((e) => e.eventType === 'close'));
    assert.equal(repo.findStoreByOfficialId('shop99998')!.brandType, 'BOOKOFF PLUS');
  });
});

describe('CSV取込', () => {
  it('商品・在庫：店舗照合、確認日時なしは在庫未確認、不正行はエラー', () => {
    const repo = freshRepo();
    const r = importProducts(repo, [
      '商品名,JAN,ISBN,カテゴリ,店舗ID,BOOKOFF価格,在庫状態,商品状態,在庫確認日時',
      '問題集,,978-4-00-000000-2,本,shop10145,"1,100円",在庫あり（確認済）,目立った傷なし,2026/11/20 10:30',
      'ゲーム,4900000000010,,ゲーム,10259,500,在庫あり（確認済）,,',
      '不正,123,,本,shop10145,100,,,',
      '店舗なし,,,本,shop00000,100,,,',
      'カテゴリ不正,,,魚,,100,,,',
    ].join('\n'), 'p.csv');
    assert.equal(r.inserted, 2);
    assert.equal(r.errors.length, 3, JSON.stringify(r.errors));
    const offers = repo.listOffers();
    assert.equal(offers[0].price, 1100);
    assert.equal(offers[0].stockStatus, '在庫あり（確認済）');
    assert.equal(offers[0].checkedAt, '2026-11-20T01:30:00.000Z');
    assert.equal(offers[1].stockStatus, '在庫未確認');
    assert.equal(repo.listProducts()[0].isbn, '9784000000002');
  });
  it('同一商品・同一店舗の再取込は更新', () => {
    const repo = freshRepo();
    const csv = (p: number) => `商品名,JAN,カテゴリ,店舗ID,BOOKOFF価格\nゲーム,4900000000010,ゲーム,shop10145,${p}`;
    importProducts(repo, csv(500), 'a.csv');
    const r = importProducts(repo, csv(400), 'b.csv');
    assert.equal(r.updated, 1);
    assert.equal(repo.listOffers().length, 1);
    assert.equal(repo.listOffers()[0].price, 400);
  });
  it('相場：出品・売却済・推定を別管理、ヤフオク／ショッピングは拒否、重複はスキップ', () => {
    const repo = freshRepo();
    const csv = [
      '商品名,JAN,販路,価格種別,価格,サンプル数,取得日時',
      'ゲーム,4900000000010,メルカリ,売却済み価格,3000,5,2026-11-20 09:00',
      'ゲーム,4900000000010,メルカリ,出品価格,3500,1,2026-11-20 09:00',
      'ゲーム,4900000000010,Yahoo!フリマ,推定相場,3200,,2026-11-20T09:00:00+09:00',
      'ゲーム,4900000000010,Yahoo!オークション,売却済み価格,3000,,2026-11-20',
      'ゲーム,4900000000010,Yahoo!ショッピング,出品価格,3000,,2026-11-20',
      'ゲーム,4900000000010,メルカリ,適当,3000,,2026-11-20',
      'ゲーム,4900000000010,メルカリ,売却済み価格,3000,5,2026-11-20 09:00',
    ].join('\n');
    const r = importMarket(repo, csv, 'm.csv');
    assert.equal(r.inserted, 3);
    assert.equal(r.errors.length, 3);
    assert.match(r.errors[0].message, /使用できません/);
    assert.equal(r.skipped, 4);
    const types = repo.listPrices().map((p) => `${p.marketplace}:${p.priceType}`).sort();
    assert.deepEqual(types, ['mercari:listing', 'mercari:sold', 'yahoo_fleamarket:estimate']);
  });
  it('一覧行：在庫なし商品は1行・店舗未取得', () => {
    const repo = freshRepo();
    importMarket(repo, '商品名,販路,価格種別,価格,取得日時\n在庫なし商品,メルカリ,売却済み価格,1000,2026-11-20', 'm.csv');
    const rows = buildRows(repo);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].store, null);
    assert.equal(rows[0].bestProfit, null);
  });
  it('店舗別集計：利益商品数（在庫確認済／全件／未確認）と、確認済在庫の想定利益合計', () => {
    const repo = freshRepo();
    importProducts(repo, [
      '商品名,JAN,カテゴリ,定価,店舗ID,BOOKOFF価格,在庫状態,在庫確認日時',
      'A,4900000000010,ゲーム,3000,shop10145,500,在庫あり（確認済）,2026-11-20 10:00',
      'B,4900000000027,ゲーム,,shop10145,500,,',
      'C,4900000000034,ゲーム,,shop10145,5000,在庫あり（確認済）,2026-11-21 10:00',
      'A,4900000000010,ゲーム,,shop10259,500,在庫なし（確認済）,2026-11-19 10:00',
    ].join('\n'), 'p.csv');
    importMarket(repo, [
      '商品名,JAN,販路,価格種別,価格,取得日時',
      'A,4900000000010,メルカリ,売却済み価格,4000,2026-11-20',
      'A,4900000000010,Amazon中古,推定相場,3500,2026-11-20',
      'B,4900000000027,メルカリ,売却済み価格,2000,2026-11-20',
      'C,4900000000034,メルカリ,売却済み価格,2000,2026-11-20',
    ].join('\n'), 'm.csv');
    const sum = summarizeStores(repo, 'all', Date.parse('2026-11-21T12:00:00+09:00'));
    const fuji = sum.find((x) => x.storeId === repo.findStoreByOfficialId('shop10145')!.id)!;
    // A：4000−500−400−210=2890（在庫あり）、B：2000−500−200−210=1090（未確認）、C：損失
    assert.deepEqual([fuji.profitable, fuji.profitableInStock, fuji.profitableUnconfirmed, fuji.profitSumInStock, fuji.premiumBoth], [2, 1, 1, 2890, 1]);
    assert.equal(fuji.lastCheckedAt, '2026-11-21T01:00:00.000Z');
    const mabuchi = sum.find((x) => x.storeId === repo.findStoreByOfficialId('shop10259')!.id)!;
    assert.deepEqual([mabuchi.profitable, mabuchi.profitableInStock, mabuchi.profitSumInStock], [1, 0, 0]); // 在庫なし（確認済）
    // 5日後には富士宮の「在庫あり」（11/20確認）は要再確認になり、確認済の合計から外れる
    const later = summarizeStores(repo, 'all', Date.parse('2026-11-25T12:00:00+09:00')).find((x) => x.storeId === fuji.storeId)!;
    assert.deepEqual([later.profitableInStock, later.profitableStale, later.profitSumInStock], [0, 1, 0]);
  });
  it('日時：TZなしはJST', () => {
    assert.equal(parseJstDate('2026-11-20'), '2026-11-19T15:00:00.000Z');
    assert.equal(parseJstDate('2026/1/2 3:04'), '2026-01-01T18:04:00.000Z');
    assert.equal(parseJstDate('2026-11-20T00:00:00Z'), '2026-11-20T00:00:00.000Z');
    assert.equal(parseJstDate('あした'), null);
  });
});

describe('HTTP API', () => {
  let server: Server; let url: string;
  before(async () => { ({ server, url } = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', demo: true, quiet: true, publicDir: 'public' })); });
  after(() => server.close());
  const get = async (p: string) => { const r = await fetch(url + p); return { status: r.status, body: await r.json() }; };
  const send = async (m: string, p: string, b?: unknown) => {
    const r = await fetch(url + p, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
    return { status: r.status, body: await r.json() };
  };

  it('一覧：デモを含み、利益順', async () => {
    const { body } = await get('/api/items?sort=profit_desc');
    assert.ok(body.total >= 10);
    const profits = body.rows.map((r: { bestProfit: { profit: number } | null }) => r.bestProfit?.profit).filter((v: unknown) => v != null);
    assert.deepEqual(profits, [...profits].sort((a: number, b: number) => b - a));
    assert.ok(body.rows.every((r: { isDemo: boolean }) => r.isDemo));
  });
  it('設定変更で再計算、不正値は400', async () => {
    const s = (await get('/api/settings')).body;
    const before = (await get('/api/items')).body.rows[0].bestProfit.profit;
    assert.equal((await send('PUT', '/api/settings', { ...s, otherCost: s.otherCost + 100 })).status, 200);
    const afterP = (await get('/api/items')).body.rows[0].bestProfit.profit;
    assert.equal(afterP, before - 100);
    assert.equal((await send('PUT', '/api/settings', { ...s, marketplaces: { ...s.marketplaces, mercari: { feeRatePercent: 150, shipping: 0 } } })).status, 400);
    await send('PUT', '/api/settings', s);
  });
  it('CSVエクスポート：BOM・未取得表記', async () => {
    const r = await fetch(`${url}/api/export.csv`);
    const t = await r.text();
    assert.match(r.headers.get('content-type')!, /text\/csv/);
    assert.ok(t.startsWith('商品名'));
    assert.match(t, /未取得/);
    assert.match(t, /デモ/);
  });
  it('未実装Providerは501', async () => {
    const r = await send('POST', '/api/providers/mercari-auto/fetch');
    assert.equal(r.status, 501);
    assert.match(r.body.error, /未実装/);
    const list = (await get('/api/providers')).body.providers;
    type P = { id: string; method: string; status: string; configured?: boolean };
    // Keepa（Amazon中古）以外の自動取得はすべて未実装。Keepaはキー未設定なら configured=false
    assert.ok(list.filter((p: P) => p.method === 'api' && p.id !== 'amazon-used-keepa').every((p: P) => p.status === 'not_implemented'));
    assert.equal(list.find((p: P) => p.id === 'amazon-used-keepa').configured, !!process.env.KEEPA_API_KEY);
  });
  it('手動登録：商品→在庫→相場', async () => {
    const p = (await send('POST', '/api/products', { name: '手動テスト', category: '本', isbn: '9784000000002' })).body;
    const store = (await get('/api/stores')).body.stores[0];
    assert.equal((await send('POST', '/api/offers', { productId: p.id, storeId: store.id, price: 100, condition: '状態未確認', stockStatus: '在庫あり（確認済）', checkedAt: '' })).body.stockStatus, '在庫未確認');
    assert.equal((await send('POST', '/api/market-prices', { productId: p.id, marketplace: 'mercari', priceType: 'sold', price: 1000, observedAt: '2026-11-20T10:00' })).status, 201);
    const rows = (await get('/api/items?q=手動テスト&dataKind=real')).body.rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].bestProfit.profit, 1000 - 100 - 100 - 210 - 0);
    assert.equal((await send('POST', '/api/market-prices', { productId: p.id, marketplace: 'yahoo_auction', priceType: 'sold', price: 1, observedAt: 'x' })).status, 400);
  });
  it('編集・削除：商品の定価を編集、相場・在庫・商品を削除', async () => {
    const p = (await send('POST', '/api/products', { name: '編集テスト', category: '本', jan: '4900000077777' })).body;
    const store = (await get('/api/stores')).body.stores[0];
    const offer = (await send('POST', '/api/offers', { productId: p.id, storeId: store.id, price: 100, condition: '状態未確認', stockStatus: '在庫未確認', checkedAt: '' })).body;
    const price = (await send('POST', '/api/market-prices', { productId: p.id, marketplace: 'mercari', priceType: 'sold', price: 1000, observedAt: '2026-11-20T10:00' })).body;
    const upd = await send('PUT', `/api/products/${p.id}`, { name: '編集後', category: 'CD', jan: '', listPrice: 1500 });
    assert.equal(upd.status, 200);
    assert.deepEqual([upd.body.name, upd.body.jan, upd.body.category, upd.body.listPrice, upd.body.listPriceSource], ['編集後', null, 'CD', 1500, '手動編集']);
    assert.equal((await send('PUT', `/api/products/${p.id}`, { name: '', category: 'CD' })).status, 400);
    assert.equal((await send('DELETE', `/api/market-prices/${price.id}`)).status, 200);
    assert.equal((await send('DELETE', `/api/market-prices/${price.id}`)).status, 404);
    assert.equal((await send('DELETE', `/api/offers/${offer.id}`)).status, 200);
    const detail = (await get(`/api/products/${p.id}`)).body;
    assert.deepEqual([detail.offers.length, detail.prices.length], [0, 0]);
    assert.equal((await send('DELETE', `/api/products/${p.id}`)).status, 200);
    assert.equal((await get(`/api/products/${p.id}`)).status, 404);
  });
  it('ページ送り：offset/limit', async () => {
    const all = (await get('/api/items?profitOnly=0&limit=2000')).body;
    const page2 = (await get('/api/items?profitOnly=0&limit=2&offset=2')).body;
    assert.equal(page2.offset, 2);
    assert.deepEqual(page2.rows.map((r: { key: string }) => r.key), all.rows.slice(2, 4).map((r: { key: string }) => r.key));
    assert.equal(page2.matched, all.matched);
  });
  it('デモ一括削除で実データは残る', async () => {
    await send('DELETE', '/api/demo');
    const { body } = await get('/api/items');
    assert.ok(body.rows.length >= 1);
    assert.ok(body.rows.every((r: { isDemo: boolean }) => !r.isDemo));
  });
});

describe('アクセス用パスワード', () => {
  it('APP_PASSWORD を設定すると、正しいパスワードなしでは401', async () => {
    const { server, url } = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', demo: false, quiet: true, publicDir: 'public', password: 'ふじ2026' });
    try {
      const r1 = await fetch(`${url}/api/meta`);
      assert.equal(r1.status, 401);
      assert.match(r1.headers.get('www-authenticate') ?? '', /Basic/);
      const auth = (p: string) => ({ authorization: `Basic ${Buffer.from(`user:${p}`).toString('base64')}` });
      assert.equal((await fetch(`${url}/api/meta`, { headers: auth('違う') })).status, 401);
      assert.equal((await fetch(`${url}/api/meta`, { headers: auth('ふじ2026') })).status, 200);
      assert.equal((await fetch(`${url}/`, { headers: auth('ふじ2026') })).status, 200);
    } finally { server.close(); }
  });
});
