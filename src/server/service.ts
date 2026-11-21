import type { Repository } from './repository.ts';
import type { ItemFilters, ItemRow, MarketPrice, Settings, StockOffer, Store, StoreSummary } from '../shared/types.ts';
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

export function queryItems(repo: Repository, f: ItemFilters): { rows: ItemRow[]; total: number } {
  const all = buildRows(repo);
  const rows = sortRows(applyFilters(all, f), f.sort, f.marketplace);
  return { rows, total: all.length };
}

/** 店舗別集計。データ種別（実データ／デモ）で絞れる */
export function summarizeStores(repo: Repository, dataKind: ItemFilters['dataKind'] = 'all', now = Date.now()): StoreSummary[] {
  const rows = applyFilters(buildRows(repo, now), { dataKind, profitOnly: false });
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
