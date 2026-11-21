import type { AppUser, Me, BulkFetchResult, DuplicateGroup, EstimateResult, StoreDiff, StoreSummary, ImportResult, ItemRow, MarketPrice, Product, ProviderInfo, Settings, StockOffer, Store, StoreEvent } from '../shared/types.ts';

export interface Meta {
  prefectures: string[]; brandTypes: string[]; categories: string[]; stockStatuses: string[]; filterStockStatuses: string[]; storeStatuses: string[];
  conditions: string[]; marketplaces: string[]; marketplaceLabel: Record<string, string>;
  priceTypes: string[]; priceTypeLabel: Record<string, string>;
  counts: { stores: number; demo: { products: number; offers: number; prices: number }; real: { products: number; offers: number; prices: number } };
  storeSeed: { source: string; verifiedAt: string };
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${r.status}`);
  return data as T;
}

export const api = {
  meta: () => req<Meta>('GET', '/api/meta'),
  me: () => req<Me>('GET', '/api/me'),
  users: () => req<{ users: AppUser[]; authMode: Me['authMode'] }>('GET', '/api/users'),
  createUser: (b: { username: string; password: string; role: string }) => req<AppUser>('POST', '/api/users', b),
  updateUser: (id: number, b: { role?: string; password?: string }) => req<AppUser>('PUT', `/api/users/${id}`, b),
  deleteUser: (id: number) => req<{ deleted: boolean; authMode: Me['authMode'] }>('DELETE', `/api/users/${id}`),
  items: (params: URLSearchParams) => req<{ total: number; matched: number; offset: number; rows: ItemRow[]; settings: Settings }>('GET', `/api/items?${params}`),
  product: (id: number) => req<{ product: Product; offers: (StockOffer & { store: Store | null })[]; prices: MarketPrice[] }>('GET', `/api/products/${id}`),
  createProduct: (b: unknown) => req<Product>('POST', '/api/products', b),
  updateProduct: (id: number, b: unknown) => req<Product>('PUT', `/api/products/${id}`, b),
  deleteProduct: (id: number) => req<unknown>('DELETE', `/api/products/${id}`),
  deleteOffer: (id: number) => req<unknown>('DELETE', `/api/offers/${id}`),
  deletePrice: (id: number) => req<unknown>('DELETE', `/api/market-prices/${id}`),
  addOffer: (b: unknown) => req<StockOffer>('POST', '/api/offers', b),
  addPrice: (b: unknown) => req<MarketPrice>('POST', '/api/market-prices', b),
  importCsv: (kind: 'products' | 'market' | 'stores', csv: string, filename: string) => req<ImportResult & { estimates?: EstimateResult }>('POST', `/api/import/${kind}`, { csv, filename }),
  diffStores: (csv: string, filename: string) => req<StoreDiff>('POST', '/api/import/stores?dryRun=1', { csv, filename }),
  recomputeEstimates: () => req<EstimateResult>('POST', '/api/estimates/recompute'),
  duplicates: () => req<{ groups: DuplicateGroup[] }>('GET', '/api/duplicates'),
  mergeProducts: (keepId: number, mergeIds: number[]) => req<{ product: Product }>('POST', '/api/products/merge', { keepId, mergeIds }),
  stores: () => req<{ stores: Store[] }>('GET', '/api/stores'),
  storeSummary: (dataKind = 'all') => req<{ summary: StoreSummary[] }>('GET', `/api/store-summary?dataKind=${dataKind}`),
  storeEvents: (id: number) => req<{ events: StoreEvent[] }>('GET', `/api/stores/${id}/events`),
  settings: () => req<Settings>('GET', '/api/settings'),
  saveSettings: (s: Settings) => req<Settings>('PUT', '/api/settings', s),
  providers: () => req<{ providers: ProviderInfo[] }>('GET', '/api/providers'),
  runProvider: (id: string) => req<{ results: unknown[] }>('POST', `/api/providers/${id}/fetch`),
  runBulk: async (id: string) => (await req<{ bulk: BulkFetchResult }>('POST', `/api/providers/${id}/fetch`)).bulk,
  seedDemo: () => req<unknown>('POST', '/api/demo'),
  deleteDemo: () => req<unknown>('DELETE', '/api/demo'),
};
