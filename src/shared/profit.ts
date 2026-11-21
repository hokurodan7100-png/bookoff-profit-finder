import { MARKETPLACES, type Category, type Marketplace, type PriceType } from './constants.ts';
import type { MarketplaceCost, MarketPrice, MarketSummary, ProfitResult, Settings } from './types.ts';

function roundYen(v: number, mode: Settings['rounding']): number {
  if (mode === 'floor') return Math.floor(v);
  if (mode === 'ceil') return Math.ceil(v);
  return Math.round(v);
}

/**
 * 想定利益 = 想定販売価格 − 仕入れ価格 − 販売手数料 − 送料 − その他費用
 * 利益率 = 想定利益 ÷ 想定販売価格 × 100
 * 投資利益率 = 想定利益 ÷ 仕入れ価格 × 100
 * 価格がない・不正な場合は null（画面では「未取得」）。
 */
export function calcProfit(args: {
  salePrice: number | null | undefined;
  purchasePrice: number | null | undefined;
  feeRatePercent: number;
  shipping: number;
  otherCost: number;
  /** 1点ごとの固定手数料（例：Amazonのカテゴリー成約料） */
  fixedFee?: number;
  /** 最低販売手数料（率で計算した額がこれ未満なら、この額） */
  minFee?: number;
  rounding?: Settings['rounding'];
}): ProfitResult | null {
  const { salePrice, purchasePrice } = args;
  if (salePrice == null || purchasePrice == null) return null;
  if (!Number.isFinite(salePrice) || !Number.isFinite(purchasePrice)) return null;
  if (salePrice <= 0 || purchasePrice < 0) return null;
  const rateFee = Math.max(roundYen((salePrice * args.feeRatePercent) / 100, args.rounding ?? 'floor'), args.minFee ?? 0);
  const fee = rateFee + (args.fixedFee ?? 0);
  const profit = salePrice - purchasePrice - fee - args.shipping - args.otherCost;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    salePrice,
    fee,
    shipping: args.shipping,
    otherCost: args.otherCost,
    profit,
    marginPercent: round1((profit / salePrice) * 100),
    roiPercent: purchasePrice > 0 ? round1((profit / purchasePrice) * 100) : null,
  };
}

/** 販路・カテゴリーに応じた手数料条件 */
export function feeTerms(cost: MarketplaceCost, category?: Category | null) {
  const c = category ? cost.categoryFees?.[category] : undefined;
  return { feeRatePercent: c?.feeRatePercent ?? cost.feeRatePercent, fixedFee: c?.fixedFee ?? 0, minFee: c?.minFee ?? 0 };
}

/** 定価との比較：Amazon中古の相場が定価を超えているか、BOOKOFF価格が定価以下か */
export function premiumOf(listPrice: number | null, amazonPrice: number | null, purchasePrice: number | null, fleaSoldPrice: number | null = null) {
  const valid = listPrice != null && listPrice > 0;
  const ratio = (v: number | null) => (valid && v != null ? Math.round((v / listPrice!) * 100) / 100 : null);
  const overList = valid && amazonPrice != null && amazonPrice > listPrice!;
  const fleaOverList = valid && fleaSoldPrice != null && fleaSoldPrice > listPrice!;
  return {
    listPrice: valid ? listPrice : null,
    amazonPrice,
    ratio: ratio(amazonPrice),
    overList,
    buyAtOrBelowList: valid && purchasePrice != null && purchasePrice <= listPrice!,
    fleaSoldPrice,
    fleaRatio: ratio(fleaSoldPrice),
    fleaOverList,
    bothOverList: overList && fleaOverList,
  };
}

/** フリマの売却済み価格：Yahoo!フリマ・メルカリそれぞれの最新の売却済み価格のうち低い方（保守的に判定） */
export function fleaSoldOf(markets: Partial<Record<Marketplace, MarketSummary>>): number | null {
  const vals = (['yahoo_fleamarket', 'mercari'] as const)
    .map((m) => markets[m]?.latest.sold?.price)
    .filter((v): v is number => typeof v === 'number');
  return vals.length ? Math.min(...vals) : null;
}

/** 種別ごとの最新値を取り出す */
export function latestByType(prices: MarketPrice[]): Record<PriceType, MarketPrice | null> {
  const out: Record<PriceType, MarketPrice | null> = { listing: null, sold: null, estimate: null };
  for (const p of prices) {
    const cur = out[p.priceType];
    if (!cur || p.observedAt > cur.observedAt || (p.observedAt === cur.observedAt && p.id > cur.id)) {
      out[p.priceType] = p;
    }
  }
  return out;
}

export function summarizeMarkets(args: {
  prices: MarketPrice[];
  purchasePrice: number | null;
  settings: Settings;
  shippingOverride?: number | null;
  otherCostOverride?: number | null;
  category?: Category | null;
}): { markets: Record<Marketplace, MarketSummary>; best: Marketplace | null; bestProfit: ProfitResult | null } {
  const { settings } = args;
  const markets = {} as Record<Marketplace, MarketSummary>;
  let best: Marketplace | null = null;
  let bestProfit: ProfitResult | null = null;
  for (const m of MARKETPLACES) {
    const latest = latestByType(args.prices.filter((p) => p.marketplace === m));
    let chosen: MarketPrice | null = null;
    for (const t of settings.priceTypePriority) {
      if (latest[t]) { chosen = latest[t]; break; }
    }
    const cost = settings.marketplaces[m];
    if (!cost) { markets[m] = { marketplace: m, latest, chosen, profit: null }; continue; }
    const terms = feeTerms(cost, args.category);
    const profit = calcProfit({
      salePrice: chosen?.price ?? null,
      purchasePrice: args.purchasePrice,
      feeRatePercent: terms.feeRatePercent,
      fixedFee: terms.fixedFee,
      minFee: terms.minFee,
      shipping: args.shippingOverride ?? cost.shipping,
      otherCost: args.otherCostOverride ?? settings.otherCost,
      rounding: settings.rounding,
    });
    markets[m] = { marketplace: m, latest, chosen, profit };
    if (profit && (!bestProfit || profit.profit > bestProfit.profit)) {
      best = m;
      bestProfit = profit;
    }
  }
  return { markets, best, bestProfit };
}
