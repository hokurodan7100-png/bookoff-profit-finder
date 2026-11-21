import type { ItemFilters, ItemRow, ProfitResult, SortKey } from './types.ts';
import { MARKETPLACES, type Marketplace } from './constants.ts';

const SORTS: SortKey[] = ['profit_desc', 'margin_desc', 'price_asc', 'updated_desc', 'premium_desc'];

function num(v: string | null): number | undefined {
  if (v == null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function str(v: string | null): string | undefined {
  const s = v?.trim();
  return s ? s : undefined;
}

export function filtersFromParams(p: URLSearchParams): ItemFilters {
  const sort = p.get('sort') as SortKey | null;
  const dataKind = p.get('dataKind');
  const mp = p.get('marketplace') as Marketplace | null;
  return {
    q: str(p.get('q')),
    code: str(p.get('code')),
    prefecture: str(p.get('prefecture')),
    store: str(p.get('store')),
    storeId: num(p.get('storeId')),
    brandType: str(p.get('brandType')),
    category: str(p.get('category')),
    minProfit: num(p.get('minProfit')),
    minMargin: num(p.get('minMargin')),
    priceMin: num(p.get('priceMin')),
    priceMax: num(p.get('priceMax')),
    stockStatus: str(p.get('stockStatus')),
    marketSince: str(p.get('marketSince')),
    dataKind: dataKind === 'real' || dataKind === 'demo' ? dataKind : 'all',
    profitOnly: p.get('profitOnly') !== '0',
    marketplace: mp && MARKETPLACES.includes(mp) ? mp : undefined,
    premiumOnly: p.get('premiumOnly') === '1',
    belowList: p.get('belowList') === '1',
    bothOver: p.get('bothOver') === '1',
    needsFleaCheck: p.get('needsFleaCheck') === '1',
    sort: sort && SORTS.includes(sort) ? sort : 'profit_desc',
  };
}

export function filtersToParams(f: ItemFilters): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'profitOnly') { if (v === false) p.set(k, '0'); continue; }
    if (k === 'premiumOnly' || k === 'belowList' || k === 'bothOver' || k === 'needsFleaCheck') { if (v === true) p.set(k, '1'); continue; }
    p.set(k, String(v));
  }
  return p;
}

/** 判定に使う利益：販路指定があればその販路、なければ最も有利な販路 */
export function profitOf(r: ItemRow, mp?: Marketplace): ProfitResult | null {
  return mp ? r.markets[mp]?.profit ?? null : r.bestProfit;
}

const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const digits = (s: string) => s.replace(/[^0-9X]/gi, '').toUpperCase();

export function applyFilters(rows: ItemRow[], f: ItemFilters): ItemRow[] {
  return rows.filter((r) => {
    if (f.dataKind === 'real' && r.isDemo) return false;
    if (f.dataKind === 'demo' && !r.isDemo) return false;
    if (f.q && !normalize(r.product.name).includes(normalize(f.q))) return false;
    if (f.code) {
      const c = digits(f.code);
      if (!c) return false;
      const hits = [r.product.jan, r.product.isbn].some((v) => v && digits(v).includes(c));
      if (!hits) return false;
    }
    if (f.prefecture && r.store?.prefecture !== f.prefecture) return false;
    if (f.storeId !== undefined && r.store?.id !== f.storeId) return false;
    if (f.store && !(r.store && normalize(r.store.name).includes(normalize(f.store)))) return false;
    if (f.brandType) {
      if (f.brandType === 'core' || f.brandType === 'related') {
        if (r.store?.brandGroup !== f.brandType) return false;
      } else if (r.store?.brandType !== f.brandType) return false;
    }
    if (f.category && r.product.category !== f.category) return false;
    if (f.stockStatus) {
      const s = r.stock?.status ?? r.offer?.stockStatus ?? '在庫未確認';
      if (s !== f.stockStatus) return false;
    }
    const price = r.offer?.price ?? null;
    if (f.priceMin !== undefined && (price == null || price < f.priceMin)) return false;
    if (f.priceMax !== undefined && (price == null || price > f.priceMax)) return false;
    if (f.premiumOnly && !r.premium?.overList) return false;
    if (f.belowList && !r.premium?.buyAtOrBelowList) return false;
    if (f.bothOver && !r.premium?.bothOverList) return false;
    if (f.needsFleaCheck && !(r.premium?.overList && r.premium.buyAtOrBelowList && r.premium.fleaSoldPrice == null)) return false;
    const pr = profitOf(r, f.marketplace);
    if (f.profitOnly && (!pr || pr.profit <= 0)) return false;
    if (f.minProfit !== undefined && (!pr || pr.profit < f.minProfit)) return false;
    if (f.minMargin !== undefined && (!pr || pr.marginPercent < f.minMargin)) return false;
    if (f.marketSince) {
      if (!r.latestMarketObservedAt) return false;
      const since = f.marketSince.length === 10 ? `${f.marketSince}T00:00:00+09:00` : f.marketSince;
      if (Date.parse(r.latestMarketObservedAt) < Date.parse(since)) return false;
    }
    return true;
  });
}

/** 値なし（未取得）は常に末尾 */
export function sortRows(rows: ItemRow[], sort: SortKey = 'profit_desc', mp?: Marketplace): ItemRow[] {
  const val = (r: ItemRow): number | null => {
    switch (sort) {
      case 'profit_desc': return profitOf(r, mp)?.profit ?? null;
      case 'margin_desc': return profitOf(r, mp)?.marginPercent ?? null;
      case 'price_asc': return r.offer?.price ?? null;
      case 'updated_desc': return r.updatedAt ? Date.parse(r.updatedAt) : null;
      case 'premium_desc': return r.premium?.ratio ?? null;
    }
  };
  const asc = sort === 'price_asc';
  return [...rows].sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va == null && vb == null) return a.key.localeCompare(b.key);
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va === vb) return a.key.localeCompare(b.key);
    return asc ? va - vb : vb - va;
  });
}
