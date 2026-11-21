import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../../src/server/db.ts';
import { Repository } from '../../src/server/repository.ts';
import { ensureSettings, seedStores } from '../../src/server/seed.ts';
import { importMarket, importProducts } from '../../src/server/importers.ts';
import { buildRows, getSettings } from '../../src/server/service.ts';
import { KeepaAmazonUsedProvider, isbn10to13 } from '../../src/server/providers/keepa.ts';
import { createProviders, refreshAmazonUsed } from '../../src/server/providers/registry.ts';
import { startServer } from '../../src/server/main.ts';

function repo() {
  const r = new Repository(openDb(':memory:'));
  ensureSettings(r); seedStores(r);
  return r;
}

/** Keepa API の応答を模したフェイク fetch */
function fakeKeepa(products: unknown[], calls: string[] = [], status = 200) {
  return (async (url: string) => {
    calls.push(String(url));
    return new Response(JSON.stringify(status === 200 ? { products, tokensLeft: 100 } : { error: { message: 'invalid key' } }), { status });
  }) as unknown as typeof fetch;
}

describe('Keepa（Amazon中古）', () => {
  it('APIキー未設定なら configured=false で実行不可', async () => {
    const p = new KeepaAmazonUsedProvider({});
    assert.equal(p.info.configured, false);
    await assert.rejects(p.fetchByCodes(['4900000000010']), /未設定/);
  });
  it('domain=5・stats=90・コードをまとめて照会し、中古の現在値と90日平均を返す（-1は出品なし）', async () => {
    const calls: string[] = [];
    const p = new KeepaAmazonUsedProvider({ apiKey: 'k', fetchImpl: fakeKeepa([
      { asin: 'B000000001', title: 'A', eanList: ['4900000000010'], stats: { current: [-1, 3000, 2500, 1200, 2200], avg90: [-1, 3100, 2400] } },
      { asin: 'B000000002', title: 'B', eanList: ['9784000000002'], stats: { current: [-1, -1, -1], avg90: [-1, -1, 1800] } },
    ], calls) });
    const m = await p.fetchByCodes(['4900000000010', '9784000000002', '4900000000999']);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /domain=5/); assert.match(calls[0], /stats=90/);
    assert.match(calls[0], /code=4900000000010,9784000000002,4900000000999/);
    assert.deepEqual(m.get('4900000000010'), { code: '4900000000010', asin: 'B000000001', title: 'A', currentUsed: 2500, avg90Used: 2400, listPrice: 2200 });
    assert.equal(m.get('9784000000002')!.currentUsed, null);
    assert.equal(m.has('4900000000999'), false);
  });
  it('100件ごとに分割して照会', async () => {
    const calls: string[] = [];
    const p = new KeepaAmazonUsedProvider({ apiKey: 'k', fetchImpl: fakeKeepa([], calls) });
    await p.fetchByCodes(Array.from({ length: 250 }, (_, i) => String(4900000000000 + i)));
    assert.equal(calls.length, 3);
  });
  it('APIエラーは例外', async () => {
    const p = new KeepaAmazonUsedProvider({ apiKey: 'bad', fetchImpl: fakeKeepa([], [], 401) });
    await assert.rejects(p.fetchByCodes(['4900000000010']), /HTTP 401.*invalid key/);
  });
  it('ISBN-10 → ISBN-13', () => {
    assert.equal(isbn10to13('4-00-310101-4'), '9784003101018');
    assert.equal(isbn10to13('abc'), null);
  });
  it('一括取得：実データのJAN/ISBN商品に保存し、Amazon中古の利益が計算される', async () => {
    const r = repo();
    importProducts(r, '商品名,JAN,ISBN,カテゴリ,店舗ID,BOOKOFF価格\nゲーム,4900000000010,,ゲーム,shop10145,1000\n文庫,,4003101014,本,shop10145,100\nコードなし,,,本,shop10145,100', 'p.csv');
    const p = new KeepaAmazonUsedProvider({ apiKey: 'k', fetchImpl: fakeKeepa([
      { asin: 'B1', eanList: ['4900000000010'], stats: { current: [-1, -1, 3000, 500, 2000], avg90: [-1, -1, 2800] } },
    ]) });
    const res = await refreshAmazonUsed(r, p);
    assert.deepEqual({ requested: res.requested, matched: res.matched, inserted: res.inserted, notFound: res.notFound, listPricesSet: res.listPricesSet },
      { requested: 2, matched: 1, inserted: 2, notFound: 1, listPricesSet: 1 });
    const row = buildRows(r).find((x) => x.product.name === 'ゲーム')!;
    const a = row.markets.amazon_used;
    assert.equal(a.chosen!.priceType, 'estimate'); // 既定の優先順位：推定相場（90日平均）
    assert.equal(a.profit!.profit, 2800 - 1000 - 420 - 210); // ゲームは15%・成約料なし
    // Keepaの定価2,000円が入り、90日平均2,800円 → 定価の1.4倍のプレミア、仕入れ1,000円は定価以下
    assert.deepEqual([row.premium.listPrice, row.premium.amazonPrice, row.premium.ratio, row.premium.overList, row.premium.buyAtOrBelowList],
      [2000, 2800, 1.4, true, true]);
    assert.equal(row.premium.bothOverList, false); // フリマの売却済み価格がまだ無い
    assert.equal(row.product.listPriceSource, 'Keepa（Amazon参考価格・ASIN B1）');
  });
});

describe('定価の取込', () => {
  it('CSVの「定価」列を取り込み、Keepaは手入力の定価を上書きしない', async () => {
    const r = repo();
    const res = importProducts(r, '商品名,JAN,カテゴリ,定価,店舗ID,BOOKOFF価格\nゲーム,4900000000010,ゲーム,"5,478円",shop10145,1000\n不正,4900000000027,ゲーム,0,shop10145,1', 'p.csv');
    assert.equal(res.inserted, 1);
    assert.match(res.errors[0].message, /定価/);
    assert.equal(r.listProducts()[0].listPrice, 5478);
    const p = new KeepaAmazonUsedProvider({ apiKey: 'k', fetchImpl: fakeKeepa([{ asin: 'B1', eanList: ['4900000000010'], stats: { current: [-1, -1, 9000, -1, 9999] } }]) });
    const bulk = await refreshAmazonUsed(r, p);
    assert.equal(bulk.listPricesSet, 0);
    assert.equal(r.listProducts()[0].listPrice, 5478);
    const row = buildRows(r)[0];
    assert.equal(row.premium.overList, true);
    assert.equal(row.premium.ratio, 1.64);
  });
});

describe('Amazon中古のCSV取込・設定', () => {
  it('販路「Amazon中古」を取り込める。ヤフオク／Yahoo!ショッピングは引き続き拒否', () => {
    const r = repo();
    const res = importMarket(r, '商品名,JAN,販路,価格種別,価格,取得日時\n本,4900000000010,Amazon中古,出品価格,1200,2026-11-20\n本,4900000000010,Yahoo!ショッピング,出品価格,1200,2026-11-20', 'm.csv');
    assert.equal(res.inserted, 1);
    assert.match(res.errors[0].message, /使用できません/);
    assert.equal(r.listPrices()[0].marketplace, 'amazon_used');
  });
  it('既存の設定（販路2つ）にAmazonの初期値を補う', () => {
    const r = new Repository(openDb(':memory:'));
    r.saveSettings({ marketplaces: { mercari: { feeRatePercent: 9, shipping: 100 }, yahoo_fleamarket: { feeRatePercent: 4, shipping: 100 } } as never, otherCost: 0, priceTypePriority: ['sold'], rounding: 'floor' } as never);
    ensureSettings(r);
    const s = getSettings(r);
    assert.equal(s.marketplaces.mercari.feeRatePercent, 9);
    assert.equal(s.marketplaces.amazon_used.feeRatePercent, 15);
    assert.equal(s.marketplaces.amazon_used.categoryFees!['本']!.fixedFee, 80);
    assert.equal(s.stockFreshDays, 3); // 後から追加された設定も初期値で補う
  });
});

describe('DB移行', () => {
  it('旧スキーマ（販路2つのCHECK制約）のDBを移行し、データを保持', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bpf-'));
    const path = join(dir, 'old.db');
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, jan TEXT, isbn TEXT, category TEXT NOT NULL, image_url TEXT, source TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0, shipping_override INTEGER, other_cost_override INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE market_prices (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        marketplace TEXT NOT NULL CHECK (marketplace IN ('mercari','yahoo_fleamarket')), price_type TEXT NOT NULL CHECK (price_type IN ('listing','sold','estimate')),
        price INTEGER NOT NULL, sample_count INTEGER, observed_at TEXT NOT NULL, source TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0, note TEXT, created_at TEXT NOT NULL);
      INSERT INTO products (name,category,source,created_at,updated_at) VALUES ('旧商品','本','t','x','x');
      INSERT INTO market_prices (product_id,marketplace,price_type,price,observed_at,source,created_at) VALUES (1,'mercari','sold',900,'2026-01-01T00:00:00Z','t','x');`);
    old.close();
    const r = new Repository(openDb(path));
    assert.equal(r.listPrices().length, 1);
    assert.equal(r.listProducts()[0].listPrice, null); // v3：定価列が追加される
    r.insertPrice({ productId: 1, marketplace: 'amazon_used', priceType: 'listing', price: 1000, observedAt: '2026-11-20T00:00:00Z', source: 't' });
    assert.equal(r.listPrices().length, 2);
  });
});

describe('API：Amazon一括取得', () => {
  it('未設定なら503、設定済み（フェイク）なら取得結果を返す', async () => {
    const keepa = new KeepaAmazonUsedProvider({ apiKey: 'k', fetchImpl: fakeKeepa([{ asin: 'B1', eanList: ['4900000099991'], stats: { current: [-1, -1, 2500], avg90: [-1, -1, -1] } }]) });
    const a = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', demo: false, quiet: true, publicDir: 'public', providers: createProviders({ keepa: new KeepaAmazonUsedProvider({}) }) });
    const b = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', demo: false, quiet: true, publicDir: 'public', providers: createProviders({ keepa }) });
    try {
      assert.equal((await fetch(`${a.url}/api/providers/amazon-used-keepa/fetch`, { method: 'POST' })).status, 503);
      importProducts(b.repo, '商品名,JAN,カテゴリ,店舗ID,BOOKOFF価格\nE,4900000099991,ゲーム,shop10145,1000', 'p.csv');
      const res = await fetch(`${b.url}/api/providers/amazon-used-keepa/fetch`, { method: 'POST' });
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.bulk.matched, 1);
      const items = await (await fetch(`${b.url}/api/items`)).json();
      assert.equal(items.rows[0].best, 'amazon_used');
      assert.equal(items.rows[0].bestProfit.profit, 2500 - 1000 - 375 - 210);
      const spapi = (await (await fetch(`${b.url}/api/providers`)).json()).providers.find((p: { id: string }) => p.id === 'amazon-used-spapi');
      assert.equal(spapi.status, 'not_implemented');
    } finally { a.server.close(); b.server.close(); }
  });
});
