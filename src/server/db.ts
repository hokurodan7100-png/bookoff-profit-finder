import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * スキーマはPostgreSQLへ移植しやすい型だけを使う（TEXT/INTEGER/REAL、日時はISO8601文字列）。
 * Prisma移行時は prisma/schema.prisma に同等モデルを定義する（docs/tasks.md）。
 */
const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  official_id TEXT UNIQUE,
  name TEXT NOT NULL,
  brand_type TEXT NOT NULL,
  brand_group TEXT NOT NULL,
  prefecture TEXT NOT NULL CHECK (prefecture IN ('静岡県','山梨県','神奈川県')),
  address TEXT NOT NULL,
  official_url TEXT,
  status TEXT NOT NULL DEFAULT '営業中',
  successor_store_id INTEGER REFERENCES stores(id),
  verified_at TEXT,
  source TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS store_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  event_type TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  jan TEXT,
  isbn TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  source TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  shipping_override INTEGER,
  other_cost_override INTEGER,
  list_price INTEGER,
  list_price_source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_jan ON products(jan);
CREATE INDEX IF NOT EXISTS idx_products_isbn ON products(isbn);
CREATE TABLE IF NOT EXISTS stock_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores(id),
  price INTEGER,
  condition TEXT NOT NULL DEFAULT '状態未確認',
  stock_status TEXT NOT NULL DEFAULT '在庫未確認',
  checked_at TEXT,
  source TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_product ON stock_offers(product_id);
CREATE TABLE IF NOT EXISTS market_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('mercari','yahoo_fleamarket','amazon_used')),
  price_type TEXT NOT NULL CHECK (price_type IN ('listing','sold','estimate')),
  price INTEGER NOT NULL,
  sample_count INTEGER,
  observed_at TEXT NOT NULL,
  source TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_market_product ON market_prices(product_id);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export function openDb(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA_V1);
  migrate(db);
  return db;
}

const SCHEMA_VERSION = 3;

/** 既存DBの移行。PRAGMA user_version で版を管理する。 */
export function migrate(db: DatabaseSync) {
  const v = Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
  if (v >= SCHEMA_VERSION) return;
  // v2: 販路に amazon_used を追加（SQLiteはCHECK制約を変更できないため表を作り直す）
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='market_prices'").get() as { sql: string } | undefined;
  if (v < 2 && row && !row.sql.includes('amazon_used')) {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('BEGIN');
    try {
      db.exec(`ALTER TABLE market_prices RENAME TO market_prices_v1;`);
      db.exec(SCHEMA_V1); // 新しい定義で market_prices を作成（他の表は IF NOT EXISTS で無変更）
      db.exec(`INSERT INTO market_prices SELECT * FROM market_prices_v1; DROP TABLE market_prices_v1;`);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    finally { db.exec('PRAGMA foreign_keys = ON;'); }
  }
  // v3: 商品に定価（list_price）を追加
  const cols = (db.prepare('PRAGMA table_info(products)').all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('list_price')) db.exec('ALTER TABLE products ADD COLUMN list_price INTEGER;');
  if (!cols.includes('list_price_source')) db.exec('ALTER TABLE products ADD COLUMN list_price_source TEXT;');
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export const nowIso = () => new Date().toISOString();
