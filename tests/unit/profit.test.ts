import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcProfit, feeTerms, fleaSoldOf, latestByType, premiumOf, summarizeMarkets } from '../../src/shared/profit.ts';
import type { MarketPrice, Settings } from '../../src/shared/types.ts';

const settings: Settings = {
  marketplaces: {
    mercari: { feeRatePercent: 10, shipping: 210 }, yahoo_fleamarket: { feeRatePercent: 5, shipping: 175 },
    amazon_used: { feeRatePercent: 15, shipping: 200, categoryFees: { 本: { fixedFee: 80 }, 家電: { feeRatePercent: 8, minFee: 30 } } },
  },
  otherCost: 50, priceTypePriority: ['estimate', 'sold', 'listing'], rounding: 'floor', stockFreshDays: 3, estimateDays: 30,
};
let id = 0;
const mp = (p: Partial<MarketPrice>): MarketPrice => ({
  id: ++id, productId: 1, marketplace: 'mercari', priceType: 'sold', price: 1000, sampleCount: null,
  observedAt: '2026-11-19T00:00:00.000Z', source: 't', isDemo: false, note: null, createdAt: '', ...p,
});

describe('calcProfit', () => {
  it('想定利益 = 販売価格 − 仕入れ − 手数料 − 送料 − その他', () => {
    const r = calcProfit({ salePrice: 2000, purchasePrice: 500, feeRatePercent: 10, shipping: 210, otherCost: 50 })!;
    assert.equal(r.fee, 200);
    assert.equal(r.profit, 2000 - 500 - 200 - 210 - 50);
    assert.equal(r.marginPercent, 52);         // 1040 / 2000
    assert.equal(r.roiPercent, 208);           // 1040 / 500
  });
  it('損失はマイナス', () => {
    const r = calcProfit({ salePrice: 1000, purchasePrice: 1000, feeRatePercent: 10, shipping: 210, otherCost: 0 })!;
    assert.equal(r.profit, -310);
    assert.equal(r.marginPercent, -31);
  });
  it('端数処理の切り替え', () => {
    const base = { salePrice: 999, purchasePrice: 0, feeRatePercent: 5, shipping: 0, otherCost: 0 };
    assert.equal(calcProfit({ ...base, rounding: 'floor' })!.fee, 49);
    assert.equal(calcProfit({ ...base, rounding: 'round' })!.fee, 50);
    assert.equal(calcProfit({ ...base, rounding: 'ceil' })!.fee, 50);
  });
  it('価格がなければ null（未取得）', () => {
    assert.equal(calcProfit({ salePrice: null, purchasePrice: 100, feeRatePercent: 10, shipping: 0, otherCost: 0 }), null);
    assert.equal(calcProfit({ salePrice: 100, purchasePrice: null, feeRatePercent: 10, shipping: 0, otherCost: 0 }), null);
    assert.equal(calcProfit({ salePrice: 0, purchasePrice: 100, feeRatePercent: 10, shipping: 0, otherCost: 0 }), null);
  });
  it('仕入れ0円なら投資利益率は null', () => {
    assert.equal(calcProfit({ salePrice: 100, purchasePrice: 0, feeRatePercent: 0, shipping: 0, otherCost: 0 })!.roiPercent, null);
  });
});

describe('latestByType / summarizeMarkets', () => {
  it('種別ごとに最新を選ぶ', () => {
    const l = latestByType([mp({ price: 1, observedAt: '2026-01-01T00:00:00Z' }), mp({ price: 2, observedAt: '2026-02-01T00:00:00Z' }), mp({ priceType: 'listing', price: 9 })]);
    assert.equal(l.sold!.price, 2);
    assert.equal(l.listing!.price, 9);
    assert.equal(l.estimate, null);
  });
  it('優先順位（推定→売却済→出品）で採用し、利益の大きい販路を選ぶ', () => {
    const prices = [
      mp({ marketplace: 'mercari', priceType: 'sold', price: 3000 }),
      mp({ marketplace: 'mercari', priceType: 'estimate', price: 2500 }),
      mp({ marketplace: 'yahoo_fleamarket', priceType: 'listing', price: 2700 }),
    ];
    const r = summarizeMarkets({ prices, purchasePrice: 1000, settings });
    assert.equal(r.markets.mercari.chosen!.priceType, 'estimate');
    assert.equal(r.markets.mercari.profit!.profit, 2500 - 1000 - 250 - 210 - 50);
    assert.equal(r.markets.yahoo_fleamarket.profit!.profit, 2700 - 1000 - 135 - 175 - 50);
    assert.equal(r.best, 'yahoo_fleamarket');
  });
  it('優先順位を変えると採用相場が変わる', () => {
    const prices = [mp({ priceType: 'sold', price: 3000 }), mp({ priceType: 'estimate', price: 2500 })];
    const r = summarizeMarkets({ prices, purchasePrice: 1000, settings: { ...settings, priceTypePriority: ['sold'] } });
    assert.equal(r.markets.mercari.chosen!.price, 3000);
  });
  it('商品別の送料・その他費用の上書き', () => {
    const r = summarizeMarkets({ prices: [mp({ price: 2000 })], purchasePrice: 500, settings, shippingOverride: 0, otherCostOverride: 0 });
    assert.equal(r.markets.mercari.profit!.profit, 2000 - 500 - 200);
  });
  it('相場がなければ利益は null', () => {
    const r = summarizeMarkets({ prices: [], purchasePrice: 500, settings });
    assert.equal(r.best, null);
    assert.equal(r.bestProfit, null);
  });
});

describe('Amazon中古の手数料', () => {
  it('カテゴリー成約料（固定費）を加算', () => {
    const r = calcProfit({ salePrice: 2000, purchasePrice: 500, feeRatePercent: 15, fixedFee: 80, shipping: 200, otherCost: 0 })!;
    assert.equal(r.fee, 300 + 80);
    assert.equal(r.profit, 2000 - 500 - 380 - 200);
  });
  it('最低販売手数料', () => {
    assert.equal(calcProfit({ salePrice: 100, purchasePrice: 0, feeRatePercent: 8, minFee: 30, shipping: 0, otherCost: 0 })!.fee, 30);
    assert.equal(calcProfit({ salePrice: 1000, purchasePrice: 0, feeRatePercent: 8, minFee: 30, shipping: 0, otherCost: 0 })!.fee, 80);
  });
  it('カテゴリー別の条件を選ぶ', () => {
    assert.deepEqual(feeTerms(settings.marketplaces.amazon_used, '本'), { feeRatePercent: 15, fixedFee: 80, minFee: 0 });
    assert.deepEqual(feeTerms(settings.marketplaces.amazon_used, '家電'), { feeRatePercent: 8, fixedFee: 0, minFee: 30 });
    assert.deepEqual(feeTerms(settings.marketplaces.amazon_used, 'CD'), { feeRatePercent: 15, fixedFee: 0, minFee: 0 });
  });
  it('3販路を比較してAmazonが最も有利なら best=amazon_used', () => {
    const prices = [
      mp({ marketplace: 'mercari', priceType: 'sold', price: 1500 }),
      mp({ marketplace: 'amazon_used', priceType: 'listing', price: 3000 }),
    ];
    const r = summarizeMarkets({ prices, purchasePrice: 500, settings, category: '本' });
    assert.equal(r.markets.amazon_used.profit!.profit, 3000 - 500 - (450 + 80) - 200 - 50);
    assert.equal(r.best, 'amazon_used');
  });
});

describe('定価との比較（プレミア）', () => {
  it('Amazon中古が定価超え、BOOKOFFが定価以下', () => {
    const r = premiumOf(1000, 1800, 500);
    assert.deepEqual([r.ratio, r.overList, r.buyAtOrBelowList, r.fleaOverList, r.bothOverList], [1.8, true, true, false, false]);
  });
  it('定価ちょうどは「超え」ではない／仕入れは「以下」に含む', () => {
    const r = premiumOf(1000, 1000, 1000);
    assert.equal(r.overList, false);
    assert.equal(r.buyAtOrBelowList, true);
  });
  it('定価やAmazon価格がなければ判定しない', () => {
    const n = premiumOf(null, 1800, 500, 2000);
    assert.deepEqual([n.listPrice, n.ratio, n.overList, n.buyAtOrBelowList, n.bothOverList], [null, null, false, false, false]);
    assert.equal(premiumOf(1000, null, 500).overList, false);
    assert.equal(premiumOf(1000, null, 500).buyAtOrBelowList, true);
  });
});

describe('両方で定価超え', () => {
  it('Amazon中古とフリマ売却済みの両方が定価超えなら true', () => {
    const r = premiumOf(1000, 1800, 500, 1300);
    assert.deepEqual([r.fleaRatio, r.fleaOverList, r.bothOverList], [1.3, true, true]);
    assert.equal(premiumOf(1000, 1800, 500, 1000).bothOverList, false); // 定価ちょうどは超えではない
    assert.equal(premiumOf(1000, 1800, 500, null).bothOverList, false); // フリマ売却済みが未登録
  });
  it('フリマ売却済みはYahoo!フリマ・メルカリの低い方。出品価格や推定相場は使わない', () => {
    const r = summarizeMarkets({ prices: [
      mp({ marketplace: 'mercari', priceType: 'sold', price: 2000 }),
      mp({ marketplace: 'yahoo_fleamarket', priceType: 'sold', price: 1500 }),
      mp({ marketplace: 'yahoo_fleamarket', priceType: 'listing', price: 900 }),
      mp({ marketplace: 'mercari', priceType: 'estimate', price: 800 }),
    ], purchasePrice: 500, settings });
    assert.equal(fleaSoldOf(r.markets), 1500);
    assert.equal(fleaSoldOf(summarizeMarkets({ prices: [mp({ marketplace: 'mercari', priceType: 'listing', price: 900 })], purchasePrice: 500, settings }).markets), null);
  });
});
