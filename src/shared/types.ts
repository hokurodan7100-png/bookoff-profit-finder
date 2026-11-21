import type {
  BrandGroup, BrandType, Category, Marketplace, Prefecture, PriceType, StockStatus, StoreStatus,
} from './constants.ts';
export type { Marketplace, PriceType } from './constants.ts';
import type { EffectiveStockStatus } from './stock.ts';

export interface Store {
  id: number;
  officialId: string | null;
  name: string;
  brandType: BrandType;
  brandGroup: BrandGroup;
  prefecture: Prefecture;
  address: string;
  officialUrl: string | null;
  status: StoreStatus;
  successorStoreId: number | null;
  verifiedAt: string | null;
  source: string;
  note: string | null;
  updatedAt: string;
}

export interface StoreEvent {
  id: number;
  storeId: number;
  eventType: 'open' | 'close' | 'move' | 'rename' | 'verify' | 'update';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurredAt: string;
  source: string;
}

export interface Product {
  id: number;
  name: string;
  jan: string | null;
  isbn: string | null;
  category: Category;
  imageUrl: string | null;
  source: string;
  isDemo: boolean;
  shippingOverride: number | null;
  otherCostOverride: number | null;
  /** 定価（税込・円） */
  listPrice: number | null;
  listPriceSource: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockOffer {
  id: number;
  productId: number;
  storeId: number | null;
  price: number | null;
  condition: string;
  stockStatus: StockStatus;
  checkedAt: string | null;
  source: string;
  isDemo: boolean;
  createdAt: string;
}

export interface MarketPrice {
  id: number;
  productId: number;
  marketplace: Marketplace;
  priceType: PriceType;
  price: number;
  sampleCount: number | null;
  observedAt: string;
  source: string;
  isDemo: boolean;
  note: string | null;
  createdAt: string;
}

export interface CategoryFee {
  /** 指定時はカテゴリー別の手数料率で上書き */
  feeRatePercent?: number;
  /** 1点ごとの固定手数料（Amazonのカテゴリー成約料など） */
  fixedFee?: number;
  /** 最低販売手数料（Amazonの30円など） */
  minFee?: number;
}

export interface MarketplaceCost {
  feeRatePercent: number;
  shipping: number;
  /** カテゴリー別の上書き（未指定のカテゴリーは基本料率・固定費0・最低手数料0） */
  categoryFees?: Partial<Record<Category, CategoryFee>>;
}

export interface Settings {
  marketplaces: Record<Marketplace, MarketplaceCost>;
  otherCost: number;
  priceTypePriority: PriceType[];
  rounding: 'floor' | 'round' | 'ceil';
  /** 「在庫あり」をこの日数を過ぎたら「要再確認」として扱う（0で無効） */
  stockFreshDays: number;
}

export interface ProfitResult {
  salePrice: number;
  fee: number;
  shipping: number;
  otherCost: number;
  profit: number;
  marginPercent: number;
  roiPercent: number | null;
}

export interface MarketSummary {
  marketplace: Marketplace;
  /** 種別ごとの最新値（ない種別は null） */
  latest: Record<PriceType, MarketPrice | null>;
  /** 利益計算に採用した相場 */
  chosen: MarketPrice | null;
  profit: ProfitResult | null;
}

export interface ItemRow {
  key: string;
  product: Product;
  offer: StockOffer | null;
  store: Store | null;
  markets: Record<Marketplace, MarketSummary>;
  best: Marketplace | null;
  bestProfit: ProfitResult | null;
  isDemo: boolean;
  /** 一覧上の情報取得日時（在庫確認・相場観測の最新） */
  updatedAt: string | null;
  latestMarketObservedAt: string | null;
  premium: PremiumInfo;
  /** 鮮度を考慮した在庫状態と、確認からの経過日数 */
  stock: { status: EffectiveStockStatus; ageDays: number | null };
}

/** 定価との比較（プレミア判定） */
export interface PremiumInfo {
  listPrice: number | null;
  /** 比較に使うAmazon中古の相場 */
  amazonPrice: number | null;
  /** Amazon中古相場 ÷ 定価（例 1.8 = 定価の1.8倍） */
  ratio: number | null;
  /** Amazon中古相場が定価を超えている */
  overList: boolean;
  /** BOOKOFF価格が定価以下 */
  buyAtOrBelowList: boolean;
  /** フリマの売却済み価格（Yahoo!フリマ・メルカリの最新の売却済み価格のうち低い方） */
  fleaSoldPrice: number | null;
  fleaRatio: number | null;
  /** フリマの売却済み価格が定価を超えている */
  fleaOverList: boolean;
  /** Amazon中古とフリマ売却済みの両方で定価超え */
  bothOverList: boolean;
}

export type SortKey = 'profit_desc' | 'margin_desc' | 'price_asc' | 'updated_desc' | 'premium_desc';

export interface ItemFilters {
  q?: string;
  code?: string;
  prefecture?: string;
  store?: string;
  storeId?: number;
  brandType?: string;
  category?: string;
  minProfit?: number;
  minMargin?: number;
  priceMin?: number;
  priceMax?: number;
  stockStatus?: string;
  marketSince?: string;
  dataKind?: 'all' | 'real' | 'demo';
  /** 既定 true：利益が出る（想定利益 > 0）商品のみ */
  profitOnly?: boolean;
  /** 指定販路での利益で判定・並び替え（未指定は最も有利な販路） */
  marketplace?: Marketplace;
  /** Amazon中古相場が定価を超える商品のみ */
  premiumOnly?: boolean;
  /** BOOKOFF価格が定価以下の商品のみ */
  belowList?: boolean;
  /** Amazon中古とフリマ売却済みの両方で定価超えの商品のみ */
  bothOver?: boolean;
  /** 確認待ち：Amazon中古が定価超え・BOOKOFFが定価以下だが、フリマの売却済み価格が未登録 */
  needsFleaCheck?: boolean;
  sort?: SortKey;
}

export interface ImportRowError { line: number; message: string }
export interface ImportResult {
  kind: 'products' | 'market' | 'stores';
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: ImportRowError[];
}

export interface ProviderInfo {
  id: string;
  kind: 'market' | 'inventory' | 'store';
  target: string;
  label: string;
  method: 'csv' | 'manual' | 'api' | 'snapshot';
  status: 'implemented' | 'not_implemented';
  /** APIキー等の設定が済んで実行可能か（api のみ意味を持つ） */
  configured?: boolean;
  /** 一括取得に対応（商品のJAN/ISBNで照会） */
  bulk?: boolean;
  reason?: string;
}

/** 店舗ごとの集計（どの店舗に行くと効率がいいか） */
export interface StoreSummary {
  storeId: number;
  /** 利益が出る商品の件数（在庫状態を問わない） */
  profitable: number;
  /** うち「在庫あり（確認済）」 */
  profitableInStock: number;
  /** うち「在庫未確認」 */
  profitableUnconfirmed: number;
  /** うち「要再確認」（在庫ありだが確認が古い） */
  profitableStale: number;
  /** 両方で定価超え・定価以下で仕入れ・利益ありの件数 */
  premiumBoth: number;
  /** 在庫あり（確認済）の利益商品の想定利益合計 */
  profitSumInStock: number;
  /** この店舗の在庫を最後に確認した日時 */
  lastCheckedAt: string | null;
}

export interface BulkFetchResult {
  providerId: string;
  requested: number;
  matched: number;
  inserted: number;
  notFound: number;
  /** 定価が未登録だった商品に、Amazonの定価（参考価格）を設定した件数 */
  listPricesSet: number;
  errors: string[];
}
