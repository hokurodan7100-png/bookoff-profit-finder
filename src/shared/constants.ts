export const PREFECTURES = ['静岡県', '山梨県', '神奈川県'] as const;
export type Prefecture = (typeof PREFECTURES)[number];

export const BRAND_TYPES = [
  'BOOKOFF',
  'BOOKOFF PLUS',
  'BOOKOFF SUPER BAZAAR',
  'B・STYLE',
  'あそビバ',
  'aidect',
  'Rehello by BOOKOFF',
  'Japan TCG Center',
  'その他',
] as const;
export type BrandType = (typeof BRAND_TYPES)[number];

/** 総合（本・ソフト・ホビー等を扱う）業態 */
export const CORE_BRANDS: readonly BrandType[] = ['BOOKOFF', 'BOOKOFF PLUS', 'BOOKOFF SUPER BAZAAR'];
export type BrandGroup = 'core' | 'related';
export const BRAND_GROUP_LABEL: Record<BrandGroup, string> = { core: '総合', related: '関連業態' };

export const BRAND_NOTES: Partial<Record<BrandType, string>> = {
  aidect: '公式一覧上の表記：金・プラチナ・ジュエリーのみ取扱',
  'B・STYLE': '取扱品目は店舗ページで要確認',
  'あそビバ': '取扱品目は店舗ページで要確認',
  'Rehello by BOOKOFF': '取扱品目は店舗ページで要確認',
  'Japan TCG Center': '取扱品目は店舗ページで要確認',
};

export function brandGroupOf(t: BrandType): BrandGroup {
  return CORE_BRANDS.includes(t) ? 'core' : 'related';
}

export function detectBrandType(storeName: string): BrandType {
  const n = storeName.trim();
  const order: [string, BrandType][] = [
    ['BOOKOFF SUPER BAZAAR', 'BOOKOFF SUPER BAZAAR'],
    ['BOOKOFF PLUS', 'BOOKOFF PLUS'],
    ['Rehello', 'Rehello by BOOKOFF'],
    ['BOOKOFF', 'BOOKOFF'],
    ['B・STYLE', 'B・STYLE'],
    ['あそビバ', 'あそビバ'],
    ['aidect', 'aidect'],
    ['Japan TCG Center', 'Japan TCG Center'],
  ];
  for (const [prefix, t] of order) if (n.startsWith(prefix)) return t;
  return 'その他';
}

export const STORE_STATUSES = ['営業中', '閉店', '移転', '改称', '要確認'] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

export const CATEGORIES = ['本', 'CD', 'DVD・BD', 'ゲーム', 'ホビー', '家電', 'その他'] as const;
export type Category = (typeof CATEGORIES)[number];

export const STOCK_STATUSES = ['在庫あり（確認済）', '在庫なし（確認済）', '在庫未確認'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];
export const DEFAULT_STOCK_STATUS: StockStatus = '在庫未確認';

export const MARKETPLACES = ['mercari', 'yahoo_fleamarket', 'amazon_used'] as const;
export type Marketplace = (typeof MARKETPLACES)[number];
export const MARKETPLACE_LABEL: Record<Marketplace, string> = {
  mercari: 'メルカリ',
  yahoo_fleamarket: 'Yahoo!フリマ',
  amazon_used: 'Amazon中古',
};
export const MARKETPLACE_SHORT: Record<Marketplace, string> = {
  mercari: 'メルカリ',
  yahoo_fleamarket: 'Yフリマ',
  amazon_used: 'Amazon',
};

/** 販路として受け付けない名称（要件：代替データ禁止） */
export const FORBIDDEN_MARKETPLACE_WORDS = ['オークション', 'ヤフオク', 'auction', 'ショッピング', 'shopping'];

export const PRICE_TYPES = ['listing', 'sold', 'estimate'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];
export const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  listing: '出品価格',
  sold: '売却済み価格',
  estimate: '推定相場',
};

export const CONDITIONS = ['新品', '未使用に近い', '目立った傷なし', 'やや傷あり', '傷あり', '状態未確認'] as const;

export const NA = '未取得';

/** 利用者の権限。admin：全操作（ユーザー管理・設定・店舗マスタ・デモ）、editor：商品・在庫・相場の登録と取込、viewer：閲覧とCSV出力のみ */
export const ROLES = ['admin', 'editor', 'viewer'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = { admin: '管理者', editor: '編集者', viewer: '閲覧のみ' };
