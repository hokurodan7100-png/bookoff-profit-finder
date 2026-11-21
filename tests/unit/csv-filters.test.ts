import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeCsvBytes, parseCsv, parseCsvRecords, toCsv } from '../../src/shared/csv.ts';
import { applyFilters, filtersFromParams, filtersToParams, sortRows } from '../../src/shared/filters.ts';
import { premiumOf } from '../../src/shared/profit.ts';
import type { ItemRow } from '../../src/shared/types.ts';

describe('CSV', () => {
  it('引用符・改行・BOM・CRLFを扱える', () => {
    const rows = parseCsv('﻿a,b,c\r\n"x,1","he said ""hi""","multi\nline"\r\n');
    assert.deepEqual(rows, [['a', 'b', 'c'], ['x,1', 'he said "hi"', 'multi\nline']]);
  });
  it('ヘッダ辞書化と行番号', () => {
    const { records } = parseCsvRecords('商品名,価格\nA,100\n\nB,200\n');
    assert.equal(records.length, 2);
    assert.equal(records[1].values['商品名'], 'B');
  });
  it('出力はBOM付き・エスケープ・数式無害化', () => {
    const s = toCsv(['a', 'b'], [['=1+1', 'x,"y"'], [-5, null]]);
    assert.ok(s.startsWith('﻿'));
    assert.match(s, /'=1\+1/);
    assert.match(s, /"x,""y"""/);
    assert.match(s, /\r\n-5,\r\n$/);
  });
  it('Shift_JISを自動判別', () => {
    // 「商品名」を Shift_JIS で表したバイト列
    const sjis = new Uint8Array([0x8f, 0xa4, 0x95, 0x69, 0x96, 0xbc]);
    const r = decodeCsvBytes(sjis);
    assert.equal(r.encoding, 'shift_jis');
    assert.equal(r.text, '商品名');
    assert.equal(decodeCsvBytes(new TextEncoder().encode('商品名')).encoding, 'utf-8');
  });
});

function row(p: Partial<{ name: string; profit: number | null; margin: number; price: number | null; pref: string; demo: boolean; updated: string | null; jan: string; stock: ItemRow['offer'] extends infer O ? O extends { stockStatus: infer S } ? S : never : never; market: string | null; brand: string }>): ItemRow {
  const profit = p.profit === undefined ? 100 : p.profit;
  return {
    key: p.name ?? 'x',
    product: { id: 1, name: p.name ?? 'x', jan: p.jan ?? null, isbn: null, category: '本', imageUrl: null, source: '', isDemo: !!p.demo, shippingOverride: null, otherCostOverride: null, listPrice: null, listPriceSource: null, createdAt: '', updatedAt: '' },
    offer: p.price === null ? null : { id: 1, productId: 1, storeId: 1, price: p.price ?? 500, condition: '', stockStatus: p.stock ?? '在庫未確認', checkedAt: null, source: '', isDemo: false, createdAt: '' },
    store: { id: 1, officialId: null, name: '富士宮北町店', brandType: (p.brand ?? 'BOOKOFF') as never, brandGroup: p.brand === 'aidect' ? 'related' : 'core', prefecture: (p.pref ?? '静岡県') as never, address: '', officialUrl: null, status: '営業中', successorStoreId: null, verifiedAt: null, source: '', note: null, updatedAt: '' },
    markets: {} as never,
    best: profit == null ? null : 'mercari',
    bestProfit: profit == null ? null : { salePrice: 1000, fee: 0, shipping: 0, otherCost: 0, profit, marginPercent: p.margin ?? 10, roiPercent: 1 },
    isDemo: !!p.demo,
    updatedAt: p.updated ?? null,
    latestMarketObservedAt: p.market === undefined ? '2026-11-19T00:00:00Z' : p.market,
    premium: premiumOf(null, null, null),
    stock: { status: p.price === null ? '在庫未確認' : p.stock ?? '在庫未確認', ageDays: null },
  };
}

describe('絞り込み', () => {
  const rows = [
    row({ name: 'ゲームＡ', profit: 1000, margin: 30, price: 300, jan: '4900000000010', stock: '在庫あり（確認済）' }),
    row({ name: '本B', profit: -50, margin: -5, price: 1500, pref: '神奈川県', demo: true }),
    row({ name: '本C', profit: null, price: null, market: null, brand: 'aidect' }),
  ];
  const f = (q: string) => applyFilters(rows, filtersFromParams(new URLSearchParams(`profitOnly=0&${q}`))).map((r) => r.product.name);
  it('商品名（全角半角を正規化）', () => assert.deepEqual(f('q=げーむa'.replace('げーむ', 'ゲーム')), ['ゲームＡ']));
  it('JAN部分一致', () => assert.deepEqual(f('code=0000000010'), ['ゲームＡ']));
  it('都道府県', () => assert.deepEqual(f('prefecture=神奈川県'), ['本B']));
  it('最低利益額・利益率（未取得は除外）', () => { assert.deepEqual(f('minProfit=0'), ['ゲームＡ']); assert.deepEqual(f('minMargin=-10'), ['ゲームＡ', '本B']); });
  it('仕入れ価格帯', () => assert.deepEqual(f('priceMin=1000&priceMax=2000'), ['本B']));
  it('在庫状態（在庫情報なしは在庫未確認扱い）', () => assert.deepEqual(f('stockStatus=在庫未確認'), ['本B', '本C']));
  it('データ種別', () => { assert.deepEqual(f('dataKind=demo'), ['本B']); assert.deepEqual(f('dataKind=real'), ['ゲームＡ', '本C']); });
  it('業態区分', () => assert.deepEqual(f('brandType=related'), ['本C']));
  it('相場の取得日時（日付のみはJST 0時）', () => { assert.deepEqual(f('marketSince=2026-11-19'), ['ゲームＡ', '本B']); assert.deepEqual(f('marketSince=2026-11-20'), []); });
  it('並び替え：未取得は常に末尾', () => {
    assert.deepEqual(sortRows(rows, 'profit_desc').map((r) => r.product.name), ['ゲームＡ', '本B', '本C']);
    assert.deepEqual(sortRows(rows, 'price_asc').map((r) => r.product.name), ['ゲームＡ', '本B', '本C']);
  });
  it('不正なsortは利益順', () => assert.equal(filtersFromParams(new URLSearchParams('sort=evil')).sort, 'profit_desc'));
  it('利益が出る商品のみ（既定ON、profitOnly=0で全件）', () => {
    const on = applyFilters(rows, filtersFromParams(new URLSearchParams(''))).map((r) => r.product.name);
    assert.deepEqual(on, ['ゲームＡ']);
    assert.equal(filtersFromParams(new URLSearchParams('profitOnly=0')).profitOnly, false);
    assert.equal(filtersToParams({ profitOnly: false }).get('profitOnly'), '0');
    assert.equal(filtersToParams({ profitOnly: true }).has('profitOnly'), false);
  });
  it('プレミア：定価超えのみ・定価以下で仕入れのみ・プレミア率順', () => {
    const a = row({ name: 'A', profit: 100 }); a.premium = premiumOf(1000, 1800, 500, 1200);
    const b = row({ name: 'B', profit: 100 }); b.premium = premiumOf(1000, 3000, 1500, 900);
    const c = row({ name: 'C', profit: 100 }); c.premium = premiumOf(1000, 900, 500, 2000);
    const names = (q: string) => sortRows(applyFilters([a, b, c], filtersFromParams(new URLSearchParams(q))), 'premium_desc').map((r) => r.product.name);
    assert.deepEqual(names('premiumOnly=1'), ['B', 'A']);
    assert.deepEqual(names('belowList=1'), ['A', 'C']);
    assert.deepEqual(names('premiumOnly=1&belowList=1'), ['A']);
    assert.equal(filtersToParams({ premiumOnly: true, belowList: false }).toString(), 'premiumOnly=1');
    // 両方で定価超え：A（Amazon1.8倍・フリマ1.2倍）のみ。BはフリマNG、CはAmazonNG
    assert.deepEqual(names('bothOver=1'), ['A']);
    assert.equal(filtersToParams({ bothOver: true }).toString(), 'bothOver=1');
    // 確認待ち：Amazon定価超え・定価以下で仕入れ・フリマ売却済み未登録
    const d = row({ name: 'D', profit: 100 }); d.premium = premiumOf(1000, 1500, 800, null);
    assert.deepEqual(applyFilters([a, b, c, d], filtersFromParams(new URLSearchParams('needsFleaCheck=1'))).map((r) => r.product.name), ['D']);
  });
  it('判定する販路を指定', () => {
    const r = row({ name: 'X', profit: 500 });
    r.markets = { amazon_used: { profit: { salePrice: 1, fee: 0, shipping: 0, otherCost: 0, profit: -10, marginPercent: -1, roiPercent: -1 } } } as never;
    assert.equal(applyFilters([r], filtersFromParams(new URLSearchParams('marketplace=amazon_used'))).length, 0);
    assert.equal(applyFilters([r], filtersFromParams(new URLSearchParams('marketplace=mercari&profitOnly=0'))).length, 1);
    assert.equal(filtersFromParams(new URLSearchParams('marketplace=yahoo_auction')).marketplace, undefined);
  });
});
