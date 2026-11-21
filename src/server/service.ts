import type { Repository } from './repository.ts';
import type { DuplicateGroup, EstimateResult, ItemFilters, ItemRow, MarketPrice, Settings, StockOffer, Store, StoreSummary } from '../shared/types.ts';
import { MARKETPLACES } from '../shared/constants.ts';
import { median, productCodes } from '../shared/codes.ts';
import { fleaSoldOf, premiumOf, summarizeMarkets } from '../shared/profit.ts';
import { applyFilters, sortRows } from '../shared/filters.ts';
import { effectiveStock } from '../shared/stock.ts';
import { DEFAULT_SETTINGS, withDefaults } from './seed.ts';

export function getSettings(repo: Repository): Settings {
  const s = repo.getSettings();
  return s ? withDefaults(s) : DEFAULT_SETTINGS;
}

const maxIso = (...vals: (string | null | undefined)[]): string | null =>
  vals.filter((v): v is string => !!v).sort().at(-1) ?? null;

/** 在庫（店舗×商品）を基準に一覧行を組み立て、販路別の相場・利益を計算する */
export function buildRows(repo: Repository, now = Date.now()): ItemRow[] {
  const settings = getSettings(repo);
  const stores = new Map<number, Store>(repo.listStores().map((s) => [s.id, s]));
  const offersByProduct = new Map<number, StockOffer[]>();
  for (const o of repo.listOffers()) {
    const list = offersByProduct.get(o.productId) ?? [];
    list.push(o);
    offersByProduct.set(o.productId, list);
  }
  const pricesByProduct = new Map<number, MarketPrice[]>();
  for (const p of repo.listPrices()) {
    const list = pricesByProduct.get(p.productId) ?? [];
    list.push(p);
    pricesByProduct.set(p.productId, list);
  }

  const rows: ItemRow[] = [];
  for (const product of repo.listProducts()) {
    const prices = pricesByProduct.get(product.id) ?? [];
    const latestMarketObservedAt = maxIso(...prices.map((p) => p.observedAt));
    const offers: (StockOffer | null)[] = offersByProduct.get(product.id) ?? [null];
    for (const offer of offers) {
      const { markets, best, bestProfit } = summarizeMarkets({
        prices,
        purchasePrice: offer?.price ?? null,
        settings,
        shippingOverride: product.shippingOverride,
        otherCostOverride: product.otherCostOverride,
        category: product.category,
      });
      rows.push({
        key: `${product.id}-${offer?.id ?? 0}`,
        product,
        offer,
        store: offer?.storeId != null ? stores.get(offer.storeId) ?? null : null,
        markets,
        best,
        bestProfit,
        isDemo: product.isDemo || !!offer?.isDemo,
        updatedAt: maxIso(offer?.checkedAt, latestMarketObservedAt),
        latestMarketObservedAt,
        stock: effectiveStock(offer, settings.stockFreshDays, now),
        premium: premiumOf(product.listPrice, markets.amazon_used?.chosen?.price ?? null, offer?.price ?? null, fleaSoldOf(markets)),
      });
    }
  }
  return rows;
}

/**
 * 一覧行のキャッシュ。利益計算を含む行の組み立ては件数に比例して重い（5万件で約1秒）ため、
 * データ・設定が変わるまで再利用する。在庫の鮮度（経過日数）が変わるので最長1分で作り直す。
 */
const ROWS_TTL_MS = 60_000;
const rowsCache = new WeakMap<Repository, { changes: number; at: number; rows: ItemRow[] }>();
export function cachedRows(repo: Repository, now = Date.now()): ItemRow[] {
  const changes = repo.changeCount();
  const c = rowsCache.get(repo);
  if (c && c.changes === changes && now - c.at < ROWS_TTL_MS) return c.rows;
  const rows = buildRows(repo, now);
  rowsCache.set(repo, { changes, at: now, rows });
  return rows;
}

export function queryItems(repo: Repository, f: ItemFilters): { rows: ItemRow[]; total: number } {
  const all = cachedRows(repo);
  const rows = sortRows(applyFilters(all, f), f.sort, f.marketplace);
  return { rows, total: all.length };
}

/** 店舗別集計。データ種別（実データ／デモ）で絞れる */
export function summarizeStores(repo: Repository, dataKind: ItemFilters['dataKind'] = 'all', now = Date.now()): StoreSummary[] {
  const rows = applyFilters(cachedRows(repo, now), { dataKind, profitOnly: false });
  const by = new Map<number, StoreSummary>();
  for (const r of rows) {
    if (!r.store) continue;
    const s = by.get(r.store.id) ?? { storeId: r.store.id, profitable: 0, profitableInStock: 0, profitableUnconfirmed: 0, profitableStale: 0, premiumBoth: 0, profitSumInStock: 0, lastCheckedAt: null };
    const checked = r.offer?.checkedAt ?? null;
    if (checked && (!s.lastCheckedAt || checked > s.lastCheckedAt)) s.lastCheckedAt = checked;
    const profit = r.bestProfit?.profit ?? 0;
    if (profit > 0) {
      s.profitable++;
      const st = r.stock.status;
      if (st === '在庫あり（確認済）') { s.profitableInStock++; s.profitSumInStock += profit; }
      if (st === '在庫未確認') s.profitableUnconfirmed++;
      if (st === '要再確認') s.profitableStale++;
      if (r.premium.bothOverList && r.premium.buyAtOrBelowList) s.premiumBoth++;
    }
    by.set(r.store.id, s);
  }
  return [...by.values()];
}

/** 自動算出した推定相場の情報取得元（CSV・手動の推定相場とは区別し、自動算出分だけを置き換える） */
export const AUTO_ESTIMATE_SOURCE = '自動算出（売却済み価格の中央値）';

/**
 * 登録済みの売却済み価格から、商品×販路ごとに直近N日の中央値と件数を推定相場として保存する。
 * 外部へのアクセスはしない。productIds を指定するとその商品だけを再計算する。
 * 取得日時は期間内で最も新しい売却済み価格の日時（後から登録した手動の推定相場より優先されないように）。
 * 1行が複数件の集計（サンプル数）でも1件として数える。デモデータは対象外。
 */
export function recomputeEstimates(repo: Repository, opts: { productIds?: number[]; now?: number } = {}): EstimateResult {
  const days = getSettings(repo).estimateDays ?? 30;
  const res: EstimateResult = { days, saved: 0, removed: 0 };
  const since = new Date((opts.now ?? Date.now()) - days * 86400000).toISOString();
  const ids = opts.productIds ?? repo.listProducts().map((p) => p.id);
  repo.tx(() => {
    for (const id of ids) {
      const prices = repo.listPricesForProduct(id);
      for (const m of MARKETPLACES) {
        // デモ（架空）の相場は対象外。実データの売却済み価格だけから算出する
        for (const isDemo of [false]) {
          const sold = days > 0
            ? prices.filter((p) => p.marketplace === m && p.priceType === 'sold' && p.isDemo === isDemo && p.observedAt >= since)
            : [];
          const price = median(sold.map((p) => p.price));
          const latest = sold.map((p) => p.observedAt).sort().at(-1);
          const r = repo.replaceAutoEstimate({ productId: id, marketplace: m, isDemo, source: AUTO_ESTIMATE_SOURCE, price,
            sampleCount: sold.length, observedAt: latest, note: `直近${days}日の売却済み価格 ${sold.length}件の中央値` });
          if (r === 'saved') res.saved++;
          if (r === 'removed') res.removed++;
        }
      }
    }
  });
  return res;
}

/** JAN・ISBN（13桁に正規化）が同じ商品のまとまりを返す。実データとデモは別扱い */
export function findDuplicates(repo: Repository): DuplicateGroup[] {
  const products = repo.listProducts();
  const offers = repo.countByProduct('stock_offers');
  const prices = repo.countByProduct('market_prices');
  // Union-Find：JANとISBNのどちらかが一致すれば同じグループ
  const parent = new Map<number, number>();
  const find = (x: number): number => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  const owner = new Map<string, number>();
  for (const p of products) {
    for (const c of productCodes(p)) {
      const key = `${p.isDemo ? 'D' : 'R'}:${c}`;
      const o = owner.get(key);
      if (o == null) owner.set(key, p.id); else parent.set(find(p.id), find(o));
    }
  }
  const groups = new Map<number, typeof products>();
  for (const p of products) {
    const r = find(p.id);
    groups.set(r, [...(groups.get(r) ?? []), p]);
  }
  return [...groups.values()].filter((g) => g.length > 1).map((g) => ({
    code: productCodes(g[0])[0],
    isDemo: g[0].isDemo,
    products: g.map((p) => ({ id: p.id, name: p.name, jan: p.jan, isbn: p.isbn, offers: offers.get(p.id) ?? 0, prices: prices.get(p.id) ?? 0, createdAt: p.createdAt })),
  }));
}
