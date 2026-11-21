import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/main.ts
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";

// src/server/db.ts
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
var SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  official_id TEXT UNIQUE,
  name TEXT NOT NULL,
  brand_type TEXT NOT NULL,
  brand_group TEXT NOT NULL,
  prefecture TEXT NOT NULL CHECK (prefecture IN ('\u9759\u5CA1\u770C','\u5C71\u68A8\u770C','\u795E\u5948\u5DDD\u770C')),
  address TEXT NOT NULL,
  official_url TEXT,
  status TEXT NOT NULL DEFAULT '\u55B6\u696D\u4E2D',
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
  condition TEXT NOT NULL DEFAULT '\u72B6\u614B\u672A\u78BA\u8A8D',
  stock_status TEXT NOT NULL DEFAULT '\u5728\u5EAB\u672A\u78BA\u8A8D',
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
function openDb(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA_V1);
  migrate(db);
  return db;
}
var SCHEMA_VERSION = 3;
function migrate(db) {
  const v = Number(db.prepare("PRAGMA user_version").get().user_version);
  if (v >= SCHEMA_VERSION) return;
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='market_prices'").get();
  if (v < 2 && row && !row.sql.includes("amazon_used")) {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec("BEGIN");
    try {
      db.exec(`ALTER TABLE market_prices RENAME TO market_prices_v1;`);
      db.exec(SCHEMA_V1);
      db.exec(`INSERT INTO market_prices SELECT * FROM market_prices_v1; DROP TABLE market_prices_v1;`);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  }
  const cols = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
  if (!cols.includes("list_price")) db.exec("ALTER TABLE products ADD COLUMN list_price INTEGER;");
  if (!cols.includes("list_price_source")) db.exec("ALTER TABLE products ADD COLUMN list_price_source TEXT;");
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();

// src/shared/constants.ts
var PREFECTURES = ["\u9759\u5CA1\u770C", "\u5C71\u68A8\u770C", "\u795E\u5948\u5DDD\u770C"];
var BRAND_TYPES = [
  "BOOKOFF",
  "BOOKOFF PLUS",
  "BOOKOFF SUPER BAZAAR",
  "B\u30FBSTYLE",
  "\u3042\u305D\u30D3\u30D0",
  "aidect",
  "Rehello by BOOKOFF",
  "Japan TCG Center",
  "\u305D\u306E\u4ED6"
];
var CORE_BRANDS = ["BOOKOFF", "BOOKOFF PLUS", "BOOKOFF SUPER BAZAAR"];
var BRAND_NOTES = {
  aidect: "\u516C\u5F0F\u4E00\u89A7\u4E0A\u306E\u8868\u8A18\uFF1A\u91D1\u30FB\u30D7\u30E9\u30C1\u30CA\u30FB\u30B8\u30E5\u30A8\u30EA\u30FC\u306E\u307F\u53D6\u6271",
  "B\u30FBSTYLE": "\u53D6\u6271\u54C1\u76EE\u306F\u5E97\u8217\u30DA\u30FC\u30B8\u3067\u8981\u78BA\u8A8D",
  "\u3042\u305D\u30D3\u30D0": "\u53D6\u6271\u54C1\u76EE\u306F\u5E97\u8217\u30DA\u30FC\u30B8\u3067\u8981\u78BA\u8A8D",
  "Rehello by BOOKOFF": "\u53D6\u6271\u54C1\u76EE\u306F\u5E97\u8217\u30DA\u30FC\u30B8\u3067\u8981\u78BA\u8A8D",
  "Japan TCG Center": "\u53D6\u6271\u54C1\u76EE\u306F\u5E97\u8217\u30DA\u30FC\u30B8\u3067\u8981\u78BA\u8A8D"
};
function brandGroupOf(t) {
  return CORE_BRANDS.includes(t) ? "core" : "related";
}
function detectBrandType(storeName) {
  const n = storeName.trim();
  const order = [
    ["BOOKOFF SUPER BAZAAR", "BOOKOFF SUPER BAZAAR"],
    ["BOOKOFF PLUS", "BOOKOFF PLUS"],
    ["Rehello", "Rehello by BOOKOFF"],
    ["BOOKOFF", "BOOKOFF"],
    ["B\u30FBSTYLE", "B\u30FBSTYLE"],
    ["\u3042\u305D\u30D3\u30D0", "\u3042\u305D\u30D3\u30D0"],
    ["aidect", "aidect"],
    ["Japan TCG Center", "Japan TCG Center"]
  ];
  for (const [prefix, t] of order) if (n.startsWith(prefix)) return t;
  return "\u305D\u306E\u4ED6";
}
var STORE_STATUSES = ["\u55B6\u696D\u4E2D", "\u9589\u5E97", "\u79FB\u8EE2", "\u6539\u79F0", "\u8981\u78BA\u8A8D"];
var CATEGORIES = ["\u672C", "CD", "DVD\u30FBBD", "\u30B2\u30FC\u30E0", "\u30DB\u30D3\u30FC", "\u5BB6\u96FB", "\u305D\u306E\u4ED6"];
var STOCK_STATUSES = ["\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", "\u5728\u5EAB\u306A\u3057\uFF08\u78BA\u8A8D\u6E08\uFF09", "\u5728\u5EAB\u672A\u78BA\u8A8D"];
var MARKETPLACES = ["mercari", "yahoo_fleamarket", "amazon_used"];
var MARKETPLACE_LABEL = {
  mercari: "\u30E1\u30EB\u30AB\u30EA",
  yahoo_fleamarket: "Yahoo!\u30D5\u30EA\u30DE",
  amazon_used: "Amazon\u4E2D\u53E4"
};
var FORBIDDEN_MARKETPLACE_WORDS = ["\u30AA\u30FC\u30AF\u30B7\u30E7\u30F3", "\u30E4\u30D5\u30AA\u30AF", "auction", "\u30B7\u30E7\u30C3\u30D4\u30F3\u30B0", "shopping"];
var PRICE_TYPES = ["listing", "sold", "estimate"];
var PRICE_TYPE_LABEL = {
  listing: "\u51FA\u54C1\u4FA1\u683C",
  sold: "\u58F2\u5374\u6E08\u307F\u4FA1\u683C",
  estimate: "\u63A8\u5B9A\u76F8\u5834"
};
var CONDITIONS = ["\u65B0\u54C1", "\u672A\u4F7F\u7528\u306B\u8FD1\u3044", "\u76EE\u7ACB\u3063\u305F\u50B7\u306A\u3057", "\u3084\u3084\u50B7\u3042\u308A", "\u50B7\u3042\u308A", "\u72B6\u614B\u672A\u78BA\u8A8D"];
var NA = "\u672A\u53D6\u5F97";

// src/server/repository.ts
var toStore = (r) => ({
  id: Number(r.id),
  officialId: r.official_id ?? null,
  name: r.name,
  brandType: r.brand_type,
  brandGroup: r.brand_group,
  prefecture: r.prefecture,
  address: r.address,
  officialUrl: r.official_url ?? null,
  status: r.status,
  successorStoreId: r.successor_store_id == null ? null : Number(r.successor_store_id),
  verifiedAt: r.verified_at ?? null,
  source: r.source,
  note: r.note ?? null,
  updatedAt: r.updated_at
});
var toProduct = (r) => ({
  id: Number(r.id),
  name: r.name,
  jan: r.jan ?? null,
  isbn: r.isbn ?? null,
  category: r.category,
  imageUrl: r.image_url ?? null,
  source: r.source,
  isDemo: Number(r.is_demo) === 1,
  shippingOverride: r.shipping_override == null ? null : Number(r.shipping_override),
  otherCostOverride: r.other_cost_override == null ? null : Number(r.other_cost_override),
  listPrice: r.list_price == null ? null : Number(r.list_price),
  listPriceSource: r.list_price_source ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});
var toOffer = (r) => ({
  id: Number(r.id),
  productId: Number(r.product_id),
  storeId: r.store_id == null ? null : Number(r.store_id),
  price: r.price == null ? null : Number(r.price),
  condition: r.condition,
  stockStatus: r.stock_status,
  checkedAt: r.checked_at ?? null,
  source: r.source,
  isDemo: Number(r.is_demo) === 1,
  createdAt: r.created_at
});
var toPrice = (r) => ({
  id: Number(r.id),
  productId: Number(r.product_id),
  marketplace: r.marketplace,
  priceType: r.price_type,
  price: Number(r.price),
  sampleCount: r.sample_count == null ? null : Number(r.sample_count),
  observedAt: r.observed_at,
  source: r.source,
  isDemo: Number(r.is_demo) === 1,
  note: r.note ?? null,
  createdAt: r.created_at
});
var Repository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  tx(fn) {
    this.db.exec("BEGIN");
    try {
      const r = fn();
      this.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  // ---------- stores ----------
  listStores() {
    return this.db.prepare("SELECT * FROM stores ORDER BY prefecture, id").all().map(toStore);
  }
  getStore(id) {
    const r = this.db.prepare("SELECT * FROM stores WHERE id = ?").get(id);
    return r ? toStore(r) : null;
  }
  findStoreByOfficialId(officialId) {
    const r = this.db.prepare("SELECT * FROM stores WHERE official_id = ?").get(officialId);
    return r ? toStore(r) : null;
  }
  findStoreByName(name) {
    const r = this.db.prepare("SELECT * FROM stores WHERE name = ? ORDER BY id LIMIT 1").get(name);
    return r ? toStore(r) : null;
  }
  countStores() {
    return Number(this.db.prepare("SELECT COUNT(*) c FROM stores").get().c);
  }
  /** 公式IDまたは店舗名で照合して挿入/更新。差分は store_events に記録。 */
  upsertStore(s) {
    const now = nowIso();
    const existing = s.officialId ? this.findStoreByOfficialId(s.officialId) : this.findStoreByName(s.name);
    const successor = s.successorOfficialId ? this.findStoreByOfficialId(s.successorOfficialId) : null;
    const next = {
      official_id: s.officialId ?? null,
      name: s.name,
      brand_type: s.brandType,
      brand_group: brandGroupOf(s.brandType),
      prefecture: s.prefecture,
      address: s.address,
      official_url: s.officialUrl ?? null,
      status: s.status ?? "\u55B6\u696D\u4E2D",
      successor_store_id: successor?.id ?? existing?.successorStoreId ?? null,
      verified_at: s.verifiedAt ?? null,
      source: s.source,
      note: s.note ?? null
    };
    if (!existing) {
      const r = this.db.prepare(`INSERT INTO stores (official_id,name,brand_type,brand_group,prefecture,address,official_url,status,successor_store_id,verified_at,source,note,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        next.official_id,
        next.name,
        next.brand_type,
        next.brand_group,
        next.prefecture,
        next.address,
        next.official_url,
        next.status,
        next.successor_store_id,
        next.verified_at,
        next.source,
        next.note,
        now,
        now
      );
      const id = Number(r.lastInsertRowid);
      this.addStoreEvent(id, "open", null, next, s.source);
      return { store: this.getStore(id), action: "inserted" };
    }
    const before = {
      name: existing.name,
      address: existing.address,
      status: existing.status,
      brand_type: existing.brandType,
      official_url: existing.officialUrl
    };
    const changed = before.name !== next.name || before.address !== next.address || before.status !== next.status || before.brand_type !== next.brand_type || before.official_url !== next.official_url || (existing.successorStoreId ?? null) !== next.successor_store_id || (existing.note ?? null) !== next.note;
    this.db.prepare(`UPDATE stores SET official_id=?,name=?,brand_type=?,brand_group=?,prefecture=?,address=?,official_url=?,status=?,
      successor_store_id=?,verified_at=COALESCE(?,verified_at),source=?,note=?,updated_at=? WHERE id=?`).run(
      next.official_id,
      next.name,
      next.brand_type,
      next.brand_group,
      next.prefecture,
      next.address,
      next.official_url,
      next.status,
      next.successor_store_id,
      next.verified_at,
      next.source,
      next.note,
      now,
      existing.id
    );
    if (changed) {
      const type = next.status === "\u9589\u5E97" && before.status !== "\u9589\u5E97" ? "close" : next.status === "\u79FB\u8EE2" || before.address !== next.address ? "move" : before.name !== next.name || next.status === "\u6539\u79F0" ? "rename" : "update";
      this.addStoreEvent(existing.id, type, before, { name: next.name, address: next.address, status: next.status }, s.source);
    } else if (s.verifiedAt) {
      this.addStoreEvent(existing.id, "verify", null, { verified_at: s.verifiedAt }, s.source);
    }
    return { store: this.getStore(existing.id), action: changed ? "updated" : "unchanged" };
  }
  addStoreEvent(storeId, type, before, after, source) {
    this.db.prepare("INSERT INTO store_events (store_id,event_type,before_json,after_json,occurred_at,source) VALUES (?,?,?,?,?,?)").run(storeId, type, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, nowIso(), source);
  }
  listStoreEvents(storeId) {
    return this.db.prepare("SELECT * FROM store_events WHERE store_id = ? ORDER BY id DESC").all(storeId).map((r) => ({
      id: Number(r.id),
      storeId: Number(r.store_id),
      eventType: r.event_type,
      before: r.before_json ? JSON.parse(r.before_json) : null,
      after: r.after_json ? JSON.parse(r.after_json) : null,
      occurredAt: r.occurred_at,
      source: r.source
    }));
  }
  // ---------- products ----------
  listProducts() {
    return this.db.prepare("SELECT * FROM products ORDER BY id").all().map(toProduct);
  }
  getProduct(id) {
    const r = this.db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    return r ? toProduct(r) : null;
  }
  findProduct(by) {
    const demo = by.isDemo ? 1 : 0;
    if (by.jan) {
      const r = this.db.prepare("SELECT * FROM products WHERE jan = ? AND is_demo = ?").get(by.jan, demo);
      if (r) return toProduct(r);
    }
    if (by.isbn) {
      const r = this.db.prepare("SELECT * FROM products WHERE isbn = ? AND is_demo = ?").get(by.isbn, demo);
      if (r) return toProduct(r);
    }
    if (by.name && !by.jan && !by.isbn) {
      const r = this.db.prepare("SELECT * FROM products WHERE name = ? AND jan IS NULL AND isbn IS NULL AND is_demo = ?").get(by.name, demo);
      if (r) return toProduct(r);
    }
    return null;
  }
  insertProduct(p) {
    const now = nowIso();
    const r = this.db.prepare(`INSERT INTO products (name,jan,isbn,category,image_url,source,is_demo,shipping_override,other_cost_override,list_price,list_price_source,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      p.name,
      p.jan ?? null,
      p.isbn ?? null,
      p.category,
      p.imageUrl ?? null,
      p.source,
      p.isDemo ? 1 : 0,
      p.shippingOverride ?? null,
      p.otherCostOverride ?? null,
      p.listPrice ?? null,
      p.listPrice != null ? p.listPriceSource ?? p.source : null,
      now,
      now
    );
    return this.getProduct(Number(r.lastInsertRowid));
  }
  updateProduct(id, p) {
    this.db.prepare(`UPDATE products SET name=?,jan=COALESCE(?,jan),isbn=COALESCE(?,isbn),category=?,image_url=COALESCE(?,image_url),source=?,
      shipping_override=COALESCE(?,shipping_override),other_cost_override=COALESCE(?,other_cost_override),
      list_price=COALESCE(?,list_price),list_price_source=CASE WHEN ? IS NULL THEN list_price_source ELSE ? END,updated_at=? WHERE id=?`).run(
      p.name,
      p.jan ?? null,
      p.isbn ?? null,
      p.category,
      p.imageUrl ?? null,
      p.source,
      p.shippingOverride ?? null,
      p.otherCostOverride ?? null,
      p.listPrice ?? null,
      p.listPrice ?? null,
      p.listPriceSource ?? p.source,
      nowIso(),
      id
    );
    return this.getProduct(id);
  }
  /** 編集画面からの更新：指定した値で置き換える（空欄は消去） */
  replaceProduct(id, p) {
    const cur = this.getProduct(id);
    if (!cur) return null;
    const lpChanged = (p.listPrice ?? null) !== cur.listPrice;
    this.db.prepare(`UPDATE products SET name=?,jan=?,isbn=?,category=?,image_url=?,shipping_override=?,other_cost_override=?,
      list_price=?,list_price_source=?,updated_at=? WHERE id=?`).run(
      p.name,
      p.jan ?? null,
      p.isbn ?? null,
      p.category,
      p.imageUrl ?? null,
      p.shippingOverride ?? null,
      p.otherCostOverride ?? null,
      p.listPrice ?? null,
      p.listPrice == null ? null : lpChanged ? "\u624B\u52D5\u7DE8\u96C6" : cur.listPriceSource,
      nowIso(),
      id
    );
    return this.getProduct(id);
  }
  deleteProduct(id) {
    return this.tx(() => {
      this.db.prepare("DELETE FROM market_prices WHERE product_id = ?").run(id);
      this.db.prepare("DELETE FROM stock_offers WHERE product_id = ?").run(id);
      return Number(this.db.prepare("DELETE FROM products WHERE id = ?").run(id).changes) > 0;
    });
  }
  deleteOffer(id) {
    return Number(this.db.prepare("DELETE FROM stock_offers WHERE id = ?").run(id).changes) > 0;
  }
  deletePrice(id) {
    return Number(this.db.prepare("DELETE FROM market_prices WHERE id = ?").run(id).changes) > 0;
  }
  /** 定価が未登録のときだけ設定する（手入力やCSVの値を自動取得で上書きしない） */
  setListPriceIfEmpty(id, listPrice, source) {
    const r = this.db.prepare("UPDATE products SET list_price=?, list_price_source=?, updated_at=? WHERE id=? AND list_price IS NULL").run(listPrice, source, nowIso(), id);
    return Number(r.changes) > 0;
  }
  // ---------- offers ----------
  listOffers() {
    return this.db.prepare("SELECT * FROM stock_offers ORDER BY id").all().map(toOffer);
  }
  listOffersForProduct(productId) {
    return this.db.prepare("SELECT * FROM stock_offers WHERE product_id = ? ORDER BY id").all(productId).map(toOffer);
  }
  insertOffer(o) {
    const r = this.db.prepare(`INSERT INTO stock_offers (product_id,store_id,price,condition,stock_status,checked_at,source,is_demo,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      o.productId,
      o.storeId ?? null,
      o.price ?? null,
      o.condition ?? "\u72B6\u614B\u672A\u78BA\u8A8D",
      o.stockStatus ?? "\u5728\u5EAB\u672A\u78BA\u8A8D",
      o.checkedAt ?? null,
      o.source,
      o.isDemo ? 1 : 0,
      nowIso()
    );
    return toOffer(this.db.prepare("SELECT * FROM stock_offers WHERE id = ?").get(Number(r.lastInsertRowid)));
  }
  /** 同一商品×同一店舗は最新の確認で置き換える */
  upsertOffer(o) {
    const existing = this.db.prepare("SELECT id FROM stock_offers WHERE product_id = ? AND store_id IS ? AND is_demo = ?").get(o.productId, o.storeId ?? null, o.isDemo ? 1 : 0);
    if (!existing) return { offer: this.insertOffer(o), action: "inserted" };
    this.db.prepare("UPDATE stock_offers SET price=?,condition=?,stock_status=?,checked_at=?,source=? WHERE id=?").run(o.price ?? null, o.condition ?? "\u72B6\u614B\u672A\u78BA\u8A8D", o.stockStatus ?? "\u5728\u5EAB\u672A\u78BA\u8A8D", o.checkedAt ?? null, o.source, Number(existing.id));
    return { offer: toOffer(this.db.prepare("SELECT * FROM stock_offers WHERE id = ?").get(Number(existing.id))), action: "updated" };
  }
  // ---------- market prices ----------
  listPrices() {
    return this.db.prepare("SELECT * FROM market_prices ORDER BY id").all().map(toPrice);
  }
  listPricesForProduct(productId) {
    return this.db.prepare("SELECT * FROM market_prices WHERE product_id = ? ORDER BY observed_at DESC, id DESC").all(productId).map(toPrice);
  }
  insertPrice(p) {
    const dup = this.db.prepare(`SELECT * FROM market_prices WHERE product_id=? AND marketplace=? AND price_type=? AND price=? AND observed_at=? AND is_demo=?`).get(p.productId, p.marketplace, p.priceType, p.price, p.observedAt, p.isDemo ? 1 : 0);
    if (dup) return { price: toPrice(dup), duplicate: true };
    const r = this.db.prepare(`INSERT INTO market_prices (product_id,marketplace,price_type,price,sample_count,observed_at,source,is_demo,note,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      p.productId,
      p.marketplace,
      p.priceType,
      p.price,
      p.sampleCount ?? null,
      p.observedAt,
      p.source,
      p.isDemo ? 1 : 0,
      p.note ?? null,
      nowIso()
    );
    return { price: toPrice(this.db.prepare("SELECT * FROM market_prices WHERE id = ?").get(Number(r.lastInsertRowid))), duplicate: false };
  }
  // ---------- demo ----------
  countDemo() {
    const c = (t) => Number(this.db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE is_demo = 1`).get().c);
    return { products: c("products"), offers: c("stock_offers"), prices: c("market_prices") };
  }
  countReal() {
    const c = (t) => Number(this.db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE is_demo = 0`).get().c);
    return { products: c("products"), offers: c("stock_offers"), prices: c("market_prices") };
  }
  deleteDemo() {
    this.tx(() => {
      this.db.exec("DELETE FROM market_prices WHERE is_demo = 1");
      this.db.exec("DELETE FROM stock_offers WHERE is_demo = 1");
      this.db.exec("DELETE FROM products WHERE is_demo = 1");
    });
  }
  // ---------- settings ----------
  getSettings() {
    const r = this.db.prepare("SELECT value_json FROM settings WHERE key = 'app'").get();
    return r ? JSON.parse(r.value_json) : null;
  }
  saveSettings(s) {
    this.db.prepare(`INSERT INTO settings (key,value_json,updated_at) VALUES ('app',?,?)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`).run(JSON.stringify(s), nowIso());
  }
};

// src/server/api.ts
import { readFile } from "node:fs/promises";
import { timingSafeEqual, createHash } from "node:crypto";
import { extname, join, normalize as normalize2 } from "node:path";

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/shared/profit.ts
function roundYen(v, mode) {
  if (mode === "floor") return Math.floor(v);
  if (mode === "ceil") return Math.ceil(v);
  return Math.round(v);
}
function calcProfit(args) {
  const { salePrice, purchasePrice } = args;
  if (salePrice == null || purchasePrice == null) return null;
  if (!Number.isFinite(salePrice) || !Number.isFinite(purchasePrice)) return null;
  if (salePrice <= 0 || purchasePrice < 0) return null;
  const rateFee = Math.max(roundYen(salePrice * args.feeRatePercent / 100, args.rounding ?? "floor"), args.minFee ?? 0);
  const fee = rateFee + (args.fixedFee ?? 0);
  const profit = salePrice - purchasePrice - fee - args.shipping - args.otherCost;
  const round1 = (n) => Math.round(n * 10) / 10;
  return {
    salePrice,
    fee,
    shipping: args.shipping,
    otherCost: args.otherCost,
    profit,
    marginPercent: round1(profit / salePrice * 100),
    roiPercent: purchasePrice > 0 ? round1(profit / purchasePrice * 100) : null
  };
}
function feeTerms(cost, category) {
  const c = category ? cost.categoryFees?.[category] : void 0;
  return { feeRatePercent: c?.feeRatePercent ?? cost.feeRatePercent, fixedFee: c?.fixedFee ?? 0, minFee: c?.minFee ?? 0 };
}
function premiumOf(listPrice, amazonPrice, purchasePrice, fleaSoldPrice = null) {
  const valid = listPrice != null && listPrice > 0;
  const ratio = (v) => valid && v != null ? Math.round(v / listPrice * 100) / 100 : null;
  const overList = valid && amazonPrice != null && amazonPrice > listPrice;
  const fleaOverList = valid && fleaSoldPrice != null && fleaSoldPrice > listPrice;
  return {
    listPrice: valid ? listPrice : null,
    amazonPrice,
    ratio: ratio(amazonPrice),
    overList,
    buyAtOrBelowList: valid && purchasePrice != null && purchasePrice <= listPrice,
    fleaSoldPrice,
    fleaRatio: ratio(fleaSoldPrice),
    fleaOverList,
    bothOverList: overList && fleaOverList
  };
}
function fleaSoldOf(markets) {
  const vals = ["yahoo_fleamarket", "mercari"].map((m) => markets[m]?.latest.sold?.price).filter((v) => typeof v === "number");
  return vals.length ? Math.min(...vals) : null;
}
function latestByType(prices) {
  const out = { listing: null, sold: null, estimate: null };
  for (const p of prices) {
    const cur = out[p.priceType];
    if (!cur || p.observedAt > cur.observedAt || p.observedAt === cur.observedAt && p.id > cur.id) {
      out[p.priceType] = p;
    }
  }
  return out;
}
function summarizeMarkets(args) {
  const { settings } = args;
  const markets = {};
  let best = null;
  let bestProfit = null;
  for (const m of MARKETPLACES) {
    const latest = latestByType(args.prices.filter((p) => p.marketplace === m));
    let chosen = null;
    for (const t of settings.priceTypePriority) {
      if (latest[t]) {
        chosen = latest[t];
        break;
      }
    }
    const cost = settings.marketplaces[m];
    if (!cost) {
      markets[m] = { marketplace: m, latest, chosen, profit: null };
      continue;
    }
    const terms = feeTerms(cost, args.category);
    const profit = calcProfit({
      salePrice: chosen?.price ?? null,
      purchasePrice: args.purchasePrice,
      feeRatePercent: terms.feeRatePercent,
      fixedFee: terms.fixedFee,
      minFee: terms.minFee,
      shipping: args.shippingOverride ?? cost.shipping,
      otherCost: args.otherCostOverride ?? settings.otherCost,
      rounding: settings.rounding
    });
    markets[m] = { marketplace: m, latest, chosen, profit };
    if (profit && (!bestProfit || profit.profit > bestProfit.profit)) {
      best = m;
      bestProfit = profit;
    }
  }
  return { markets, best, bestProfit };
}

// src/shared/filters.ts
var SORTS = ["profit_desc", "margin_desc", "price_asc", "updated_desc", "premium_desc"];
function num(v) {
  if (v == null || v.trim() === "") return void 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : void 0;
}
function str(v) {
  const s = v?.trim();
  return s ? s : void 0;
}
function filtersFromParams(p) {
  const sort = p.get("sort");
  const dataKind = p.get("dataKind");
  const mp = p.get("marketplace");
  return {
    q: str(p.get("q")),
    code: str(p.get("code")),
    prefecture: str(p.get("prefecture")),
    store: str(p.get("store")),
    storeId: num(p.get("storeId")),
    brandType: str(p.get("brandType")),
    category: str(p.get("category")),
    minProfit: num(p.get("minProfit")),
    minMargin: num(p.get("minMargin")),
    priceMin: num(p.get("priceMin")),
    priceMax: num(p.get("priceMax")),
    stockStatus: str(p.get("stockStatus")),
    marketSince: str(p.get("marketSince")),
    dataKind: dataKind === "real" || dataKind === "demo" ? dataKind : "all",
    profitOnly: p.get("profitOnly") !== "0",
    marketplace: mp && MARKETPLACES.includes(mp) ? mp : void 0,
    premiumOnly: p.get("premiumOnly") === "1",
    belowList: p.get("belowList") === "1",
    bothOver: p.get("bothOver") === "1",
    needsFleaCheck: p.get("needsFleaCheck") === "1",
    sort: sort && SORTS.includes(sort) ? sort : "profit_desc"
  };
}
function profitOf(r, mp) {
  return mp ? r.markets[mp]?.profit ?? null : r.bestProfit;
}
var normalize = (s) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
var digits = (s) => s.replace(/[^0-9X]/gi, "").toUpperCase();
function applyFilters(rows, f) {
  return rows.filter((r) => {
    if (f.dataKind === "real" && r.isDemo) return false;
    if (f.dataKind === "demo" && !r.isDemo) return false;
    if (f.q && !normalize(r.product.name).includes(normalize(f.q))) return false;
    if (f.code) {
      const c = digits(f.code);
      if (!c) return false;
      const hits = [r.product.jan, r.product.isbn].some((v) => v && digits(v).includes(c));
      if (!hits) return false;
    }
    if (f.prefecture && r.store?.prefecture !== f.prefecture) return false;
    if (f.storeId !== void 0 && r.store?.id !== f.storeId) return false;
    if (f.store && !(r.store && normalize(r.store.name).includes(normalize(f.store)))) return false;
    if (f.brandType) {
      if (f.brandType === "core" || f.brandType === "related") {
        if (r.store?.brandGroup !== f.brandType) return false;
      } else if (r.store?.brandType !== f.brandType) return false;
    }
    if (f.category && r.product.category !== f.category) return false;
    if (f.stockStatus) {
      const s = r.stock?.status ?? r.offer?.stockStatus ?? "\u5728\u5EAB\u672A\u78BA\u8A8D";
      if (s !== f.stockStatus) return false;
    }
    const price2 = r.offer?.price ?? null;
    if (f.priceMin !== void 0 && (price2 == null || price2 < f.priceMin)) return false;
    if (f.priceMax !== void 0 && (price2 == null || price2 > f.priceMax)) return false;
    if (f.premiumOnly && !r.premium?.overList) return false;
    if (f.belowList && !r.premium?.buyAtOrBelowList) return false;
    if (f.bothOver && !r.premium?.bothOverList) return false;
    if (f.needsFleaCheck && !(r.premium?.overList && r.premium.buyAtOrBelowList && r.premium.fleaSoldPrice == null)) return false;
    const pr = profitOf(r, f.marketplace);
    if (f.profitOnly && (!pr || pr.profit <= 0)) return false;
    if (f.minProfit !== void 0 && (!pr || pr.profit < f.minProfit)) return false;
    if (f.minMargin !== void 0 && (!pr || pr.marginPercent < f.minMargin)) return false;
    if (f.marketSince) {
      if (!r.latestMarketObservedAt) return false;
      const since = f.marketSince.length === 10 ? `${f.marketSince}T00:00:00+09:00` : f.marketSince;
      if (Date.parse(r.latestMarketObservedAt) < Date.parse(since)) return false;
    }
    return true;
  });
}
function sortRows(rows, sort = "profit_desc", mp) {
  const val = (r) => {
    switch (sort) {
      case "profit_desc":
        return profitOf(r, mp)?.profit ?? null;
      case "margin_desc":
        return profitOf(r, mp)?.marginPercent ?? null;
      case "price_asc":
        return r.offer?.price ?? null;
      case "updated_desc":
        return r.updatedAt ? Date.parse(r.updatedAt) : null;
      case "premium_desc":
        return r.premium?.ratio ?? null;
    }
  };
  const asc = sort === "price_asc";
  return [...rows].sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va == null && vb == null) return a.key.localeCompare(b.key);
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va === vb) return a.key.localeCompare(b.key);
    return asc ? va - vb : vb - va;
  });
}

// src/shared/stock.ts
var STALE_STOCK = "\u8981\u518D\u78BA\u8A8D";
var FILTER_STOCK_STATUSES = ["\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", STALE_STOCK, "\u5728\u5EAB\u306A\u3057\uFF08\u78BA\u8A8D\u6E08\uFF09", "\u5728\u5EAB\u672A\u78BA\u8A8D"];
var DAY = 864e5;
function effectiveStock(offer, freshDays, now = Date.now()) {
  if (!offer) return { status: "\u5728\u5EAB\u672A\u78BA\u8A8D", ageDays: null };
  const t = offer.checkedAt ? Date.parse(offer.checkedAt) : NaN;
  const ageMs = Number.isNaN(t) ? null : Math.max(0, now - t);
  const ageDays = ageMs == null ? null : Math.floor(ageMs / DAY);
  if (offer.stockStatus === "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09" && freshDays > 0 && ageMs != null && ageMs > freshDays * DAY) {
    return { status: STALE_STOCK, ageDays };
  }
  return { status: offer.stockStatus, ageDays };
}

// data/stores.seed.json
var stores_seed_default = {
  verifiedAt: "2026-11-20T08:10:00+09:00",
  source: "BOOKOFF\u516C\u5F0F\u300C\u304A\u5E97\u3092\u63A2\u3059\u300D\u90FD\u9053\u5E9C\u770C\u5225\u4E00\u89A7\uFF08\u9759\u5CA1\u770C\u30FB\u5C71\u68A8\u770C\u30FB\u795E\u5948\u5DDD\u770C\uFF09",
  expectedCounts: {
    \u9759\u5CA1\u770C: 26,
    \u5C71\u68A8\u770C: 6,
    \u795E\u5948\u5DDD\u770C: 70
  },
  stores: [
    {
      officialId: "shop10259",
      name: "BOOKOFF \u9759\u5CA1\u99AC\u6E15\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u9759\u5CA1\u5E02\u99FF\u6CB3\u533A\u99AC\u6E153-4-6",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10259.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10469",
      name: "BOOKOFF \u9759\u5CA1\u6D41\u901A\u901A\u308A\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u9759\u5CA1\u5E02\u8475\u533A\u6771\u5343\u4EE3\u75301-7-16",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10469.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10251",
      name: "BOOKOFF \u6E05\u6C34\u5CA1\u753A\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u9759\u5CA1\u5E02\u6E05\u6C34\u533A\u5CA1\u753A6-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10251.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10845",
      name: "BOOKOFF \u6D5C\u677E\u5317\u5BFA\u5CF6\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6D5C\u677E\u5E02\u4E2D\u592E\u533A\u5317\u5BFA\u5CF6\u753A492-2 \u30D0\u30ED\u30FC\u5317\u5BFA\u5CF6\u5E97\uFF12F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10845.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10041",
      name: "BOOKOFF \u6D5C\u677E\u9AD8\u6797\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6D5C\u677E\u5E02\u4E2D\u592E\u533A\u9AD8\u67975-6-15",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10041.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10656",
      name: "BOOKOFF \u6D5C\u677E\u5BCC\u585A\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6D5C\u677E\u5E02\u4E2D\u592E\u533A\u5BCC\u585A\u753A1710-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10656.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10746",
      name: "BOOKOFF \u6D5C\u677E\u539F\u5CF6\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6D5C\u677E\u5E02\u4E2D\u592E\u533A\u539F\u5CF6\u753A305",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10746.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10289",
      name: "BOOKOFF \u6D5C\u677E\u82B3\u5DDD\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6D5C\u677E\u5E02\u4E2D\u592E\u533A\u90FD\u76DB\u753A85-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10289.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10321",
      name: "BOOKOFF \u6D5C\u677E\u521D\u751F\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6D5C\u677E\u5E02\u4E2D\u592E\u533A\u521D\u751F\u753A590-6",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10321.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10226",
      name: "BOOKOFF PLUS \u6D5C\u5317\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6D5C\u677E\u5E02\u6D5C\u540D\u533A\u672C\u6CA2\u5408805",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10226.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10219",
      name: "BOOKOFF \u6CBC\u6D25\u30EA\u30B3\u30FC\u901A\u308A\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6CBC\u6D25\u5E02\u5BFF\u753A23-33",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10219.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10307",
      name: "BOOKOFF \u4E09\u5CF6\u5FB3\u5009\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u4E09\u5CF6\u5E02\u5FB3\u50094-36-3",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10307.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10145",
      name: "BOOKOFF \u5BCC\u58EB\u5BAE\u5317\u753A\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u5BCC\u58EB\u5BAE\u5E02\u5317\u753A21-8",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10145.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10489",
      name: "BOOKOFF \u9759\u5CA1\u5CF6\u7530\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u5CF6\u7530\u5E02\u4E2D\u6CB3\u753A8968-5",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10489.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10271",
      name: "BOOKOFF \u5BCC\u58EB\u672C\u5409\u539F\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u5BCC\u58EB\u5E02\u4ECA\u6CC91-17-41",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10271.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10546",
      name: "BOOKOFF PLUS \u5BCC\u58EB\u4E2D\u5CF6\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u5BCC\u58EB\u5E02\u4E2D\u5CF6417-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10546.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10608",
      name: "BOOKOFF \u78D0\u7530\u4ECA\u4E4B\u6D66\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u78D0\u7530\u5E02\u4ECA\u4E4B\u6D664-21-10",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10608.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10191",
      name: "BOOKOFF \u639B\u5DDD\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u639B\u5DDD\u5E02\u5927\u6C602999-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10191.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10050",
      name: "BOOKOFF \u85E4\u679D\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u85E4\u679D\u5E02\u5C0F\u77F3\u5DDD\u753A3-18-30",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10050.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10222",
      name: "BOOKOFF \u5FA1\u6BBF\u5834\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u5FA1\u6BBF\u5834\u5E02\u6771\u7530\u4E2D2-2-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10222.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10158",
      name: "BOOKOFF \u888B\u4E95\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u888B\u4E95\u5E02\u5DDD\u4E951014-4",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10158.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10611",
      name: "BOOKOFF \u6E56\u897F\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u6E56\u897F\u5E02\u65B0\u5C45\u753A\u4E2D\u4E4B\u90F72296-8",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10611.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10696",
      name: "BOOKOFF \u4F0A\u8C46\u306E\u56FD\u5927\u4EC1\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u4F0A\u8C46\u306E\u56FD\u5E02\u5409\u7530395",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10696.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop20237",
      name: "BOOKOFF \u9759\u5CA1\u699B\u539F\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u7267\u4E4B\u539F\u5E02\u7D30\u6C5F2081",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20237.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10074",
      name: "BOOKOFF \u51FD\u5357\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u7530\u65B9\u90E1\u51FD\u5357\u753A\u585A\u672C135-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10074.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop10527",
      name: "BOOKOFF \u9759\u5CA1\u9577\u6CC9\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u9759\u5CA1\u770C",
      address: "\u9759\u5CA1\u770C\u99FF\u6771\u90E1\u9577\u6CC9\u753A\u7AF9\u539F370-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10527.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/22.html"
    },
    {
      officialId: "shop20545",
      name: "BOOKOFF SUPER BAZAAR \u7532\u5E9C\u8CA2\u5DDD\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u5C71\u68A8\u770C",
      address: "\u5C71\u68A8\u770C\u7532\u5E9C\u5E02\u5BCC\u7AF91\u4E01\u76EE10-33",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20545.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/19.html"
    },
    {
      officialId: "shop83010",
      name: "B\u30FBSTYLE \u7532\u5E9C\u5411\u753A\u5E97",
      brandType: "B\u30FBSTYLE",
      prefecture: "\u5C71\u68A8\u770C",
      address: "\u5C71\u68A8\u770C\u7532\u5E9C\u5E02\u5411\u753A727",
      officialUrl: "https://www.bookoff.co.jp/shop/shop83010.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/19.html"
    },
    {
      officialId: "shop20290",
      name: "BOOKOFF \u5BCC\u58EB\u5409\u7530\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u5C71\u68A8\u770C",
      address: "\u5C71\u68A8\u770C\u5BCC\u58EB\u5409\u7530\u5E02\u65B0\u897F\u539F5-1-8",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20290.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/19.html"
    },
    {
      officialId: "shop20340",
      name: "BOOKOFF \u5C71\u68A8\u53CC\u8449\u97FF\u30F6\u4E18\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u5C71\u68A8\u770C",
      address: "\u5C71\u68A8\u770C\u7532\u6590\u5E02\u9F8D\u57303296-3",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20340.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/19.html"
    },
    {
      officialId: "shop20316",
      name: "BOOKOFF 20\u53F7\u5C71\u68A8\u77F3\u548C\u5E83\u702C\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u5C71\u68A8\u770C",
      address: "\u5C71\u68A8\u770C\u7B1B\u5439\u5E02\u77F3\u548C\u753A\u5E83\u702C1374-147",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20316.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/19.html"
    },
    {
      officialId: "shop20497",
      name: "BOOKOFF PLUS \u7530\u5BCC\u662D\u548C\u901A\u308A\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u5C71\u68A8\u770C",
      address: "\u5C71\u68A8\u770C\u4E2D\u592E\u5E02\u5C71\u4E4B\u795E3356-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20497.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/19.html"
    },
    {
      officialId: "shop20450",
      name: "BOOKOFF \u9DB4\u898B\u99C5\u897F\u53E3\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u9DB4\u898B\u533A\u8C4A\u5CA1\u753A15-29",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20450.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20404",
      name: "BOOKOFF \u30A2\u30AF\u30ED\u30B9\u30D7\u30E9\u30B6\u6771\u795E\u5948\u5DDD\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u795E\u5948\u5DDD\u533A\u897F\u5BFA\u5C3E1-16-15",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20404.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20434",
      name: "BOOKOFF \u6A2A\u6D5C\u30D3\u30D6\u30EC\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u897F\u533A\u5357\u5E782-15-13 \u6A2A\u6D5C\u30D3\u30D6\u30EC8F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20434.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop80211",
      name: "\u3042\u305D\u30D3\u30D0 \u6A2A\u6D5C\u30D3\u30D6\u30EC\u5E97",
      brandType: "\u3042\u305D\u30D3\u30D0",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u897F\u533A\u5357\u5E782-15-13 \u6A2A\u6D5C\u30D3\u30D6\u30EC8\u968E\u30FB9\u968E",
      officialUrl: "https://www.bookoff.co.jp/shop/shop80211.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20279",
      name: "BOOKOFF PLUS \u6A2A\u6D5C\u4F0A\u52E2\u4F50\u6728\u30E2\u30FC\u30EB\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u4E2D\u533A\u4F0A\u52E2\u4F50\u6728\u753A1-7-7",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20279.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20527",
      name: "BOOKOFF \u30A4\u30AA\u30F3\u672C\u7267\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u4E2D\u533A\u672C\u7267\u539F7-1 \u30A4\u30AA\u30F3\u672C\u7267 5F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20527.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10617",
      name: "BOOKOFF \u6A2A\u6D5C\u671D\u6BD4\u5948\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u91D1\u6CA2\u533A\u6771\u671D\u6BD4\u59483-24",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10617.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20467",
      name: "BOOKOFF SUPER BAZAAR \u7DB1\u5CF6\u6A3D\u753A\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u6E2F\u5317\u533A\u6A3D\u753A3-12-25",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20467.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop83045",
      name: "BOOKOFF SUPER BAZAAR \u7DB1\u5CF6\u6A3D\u753A\u5E97\uFF08\u672C\u30FB\u30C8\u30EC\u30AB\u9928\uFF09",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u6E2F\u5317\u533A\u6A3D\u753A3-12-26",
      officialUrl: "https://www.bookoff.co.jp/shop/shop83045.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20313",
      name: "BOOKOFF \u6E2F\u5317\u7DB1\u5CF6\u897F\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u6E2F\u5317\u533A\u7DB1\u5CF6\u897F2-12-8",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20313.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20379",
      name: "BOOKOFF SUPER BAZAAR \u6A2A\u6D5C\u6771\u6238\u585A\u30AA\u30EA\u30F3\u30D4\u30C3\u30AF\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u6238\u585A\u533A\u5DDD\u4E0A\u753A52-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20379.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop41110",
      name: "aidect \u6E2F\u5357\u53F0\u30D0\u30FC\u30BA\u5E97",
      brandType: "aidect",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u6E2F\u5357\u533A\u6E2F\u5357\u53F03-1-3 \u6E2F\u5357\u53F0\u30D0\u30FC\u30BA 3F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop41110.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10413",
      name: "BOOKOFF \u6A2A\u6D5C\u6E2F\u5357\u4E38\u5C71\u53F0\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u6E2F\u5357\u533A\u4E38\u5C71\u53F04-3-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10413.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10612",
      name: "BOOKOFF \u6A2A\u6D5C\u9DB4\u30F6\u5CF0\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u65ED\u533A\u9DB4\u30B1\u5CF0\u672C\u753A1-27-13",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10612.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10727",
      name: "BOOKOFF \u6A2A\u6D5C\u4E2D\u5C71\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u7DD1\u533A\u53F0\u6751\u753A370-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10727.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10335",
      name: "BOOKOFF \u6A2A\u6D5C\u5341\u65E5\u5E02\u5834\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u7DD1\u533A\u5341\u65E5\u5E02\u5834\u753A882-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10335.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20241",
      name: "BOOKOFF \u6A2A\u6D5C\u9D28\u5C45\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u7DD1\u533A\u6771\u672C\u90F76-1-26",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20241.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20270",
      name: "BOOKOFF SUPER BAZAAR \u6A2A\u6D5C\u702C\u8C37\u5357\u53F0\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u702C\u8C37\u533A\u5357\u53F01-45-2",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20270.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop83018",
      name: "BOOKOFF SUPER BAZAAR \u6A2A\u6D5C\u702C\u8C37\u5357\u53F0\u5E97\uFF08\u30DB\u30D3\u30FC\u30FB\u30C8\u30EC\u30AB\u9928\uFF09",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u702C\u8C37\u533A\u5357\u53F01-45-3",
      officialUrl: "https://www.bookoff.co.jp/shop/shop83018.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10744",
      name: "BOOKOFF \u6A2A\u6D5C\u672C\u90F7\u53F0\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u6804\u533A\u98EF\u5CF6\u753A1434",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10744.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20079",
      name: "BOOKOFF \u6A2A\u6D5C\u3042\u3056\u307F\u91CE\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u9752\u8449\u533A\u3042\u3056\u307F\u91CE1-4-3",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20079.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop41108",
      name: "aidect \u3089\u3089\u307D\u30FC\u3068\u6A2A\u6D5C\u5E97",
      brandType: "aidect",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u90FD\u7B51\u533A\u6C60\u8FBA\u753A4035-1 \u3089\u3089\u307D\u30FC\u3068\u6A2A\u6D5C 2F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop41108.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20509",
      name: "BOOKOFF SUPER BAZAAR \u30CE\u30FC\u30B9\u30DD\u30FC\u30C8\uFF65\u30E2\u30FC\u30EB\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u6D5C\u5E02\u90FD\u7B51\u533A\u4E2D\u5DDD\u4E2D\u592E1-25-1 \u30CE\u30FC\u30B9\u30DD\u30FC\u30C8\uFF65\u30E2\u30FC\u30EB1F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20509.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20120",
      name: "BOOKOFF SUPER BAZAAR \u5DDD\u5D0E\u30E2\u30A2\u30FC\u30BA\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u5DDD\u5D0E\u533A\u99C5\u524D\u672C\u753A7 \u5CA1\u7530\u5C4B\u30E2\u30A2\u30FC\u30BA3\uFF656F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20120.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20431",
      name: "BOOKOFF SUPER BAZAAR 409\u53F7\u5DDD\u5D0E\u6E2F\u753A\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u5DDD\u5D0E\u533A\u6E2F\u753A12-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20431.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20240",
      name: "BOOKOFF SUPER BAZAAR \u56FD\u90531\u53F7\u591A\u6469\u5DDD\u5927\u6A4B\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u5E78\u533A\u5C0F\u5411\u753A5-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20240.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10284",
      name: "BOOKOFF \u6B66\u8535\u4E2D\u539F\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u4E2D\u539F\u533A\u4E0A\u5C0F\u7530\u4E2D6-12-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10284.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop80106",
      name: "Rehello by BOOKOFF \u5143\u4F4F\u5409\u30D6\u30EC\u30FC\u30E1\u30F3\u901A\u308A\u5E97",
      brandType: "Rehello by BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u4E2D\u539F\u533A\u6728\u67081-27-12",
      officialUrl: "https://www.bookoff.co.jp/shop/shop80106.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20160",
      name: "BOOKOFF \u6B66\u8535\u65B0\u57CE\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u4E2D\u539F\u533A\u65B0\u57CE1-14-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20160.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20122",
      name: "BOOKOFF 246\u5DDD\u5D0E\u68B6\u30F6\u8C37\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u9AD8\u6D25\u533A\u4E0B\u4F5C\u5EF63-7-7",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20122.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20542",
      name: "BOOKOFF \u30A4\u30C8\u30FC\u30E8\u30FC\u30AB\u30C9\u30FC\u6E9D\u30CE\u53E3\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u9AD8\u6D25\u533A\u4E45\u672C3\u4E01\u76EE6-20",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20542.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10586",
      name: "BOOKOFF JR\u7A32\u7530\u5824\u99C5\u524D\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u591A\u6469\u533A\u83C5\u7A32\u7530\u58241-3-4",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10586.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10411",
      name: "BOOKOFF \u5DDD\u5D0E\u9577\u6CA2\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u591A\u6469\u533A\u9577\u6CA24-29-5",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10411.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20419",
      name: "BOOKOFF \u5411\u30F6\u4E18\u904A\u5712\u99C5\u524D\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u591A\u6469\u533A\u767B\u62382102-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20419.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20238",
      name: "BOOKOFF PLUS \u6771\u540D\u5DDD\u5D0E\u30A4\u30F3\u30BF\u30FC\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u5BAE\u524D\u533A\u571F\u6A4B6-1-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20238.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20134",
      name: "BOOKOFF \u5DDD\u5D0E\u6771\u6709\u99AC\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u5BAE\u524D\u533A\u6771\u6709\u99AC3-23-15",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20134.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20432",
      name: "BOOKOFF \u65B0\u767E\u5408\u4E18\u30AA\u30FC\u30D1\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5DDD\u5D0E\u5E02\u9EBB\u751F\u533A\u4E0A\u9EBB\u751F1-1-1 \u65B0\u767E\u5408\u4E18\u30AA\u30FC\u30D1 4F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20432.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20538",
      name: "BOOKOFF \u30A4\u30AA\u30F3\u6A4B\u672C\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u76F8\u6A21\u539F\u5E02\u7DD1\u533A\u6A4B\u672C6-2-1 \u30A4\u30AA\u30F3\u6A4B\u672C 4F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20538.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20166",
      name: "BOOKOFF PLUS 16\u53F7\u76F8\u6A21\u539F\u5BCC\u58EB\u898B\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u76F8\u6A21\u539F\u5E02\u4E2D\u592E\u533A\u5BCC\u58EB\u898B3-15-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20166.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20163",
      name: "BOOKOFF PLUS 16\u53F7\u76F8\u6A21\u539F\u4E0A\u9DB4\u9593\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u76F8\u6A21\u539F\u5E02\u5357\u533A\u4E0A\u9DB4\u95932-5-2",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20163.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20042",
      name: "BOOKOFF PLUS \u53E4\u6DF5\u99C5\u524D\u5E97\uFF08\u672C\u30FB\u30BD\u30D5\u30C8\u9928\uFF09",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u76F8\u6A21\u539F\u5E02\u5357\u533A\u53E4\u6DF52-19-14",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20042.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop82033",
      name: "BOOKOFF PLUS \u53E4\u6DF5\u99C5\u524D\u5E97\uFF08\u30A2\u30D1\u30EC\u30EB\u30FB\u5BB6\u96FB\u9928\uFF09",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u76F8\u6A21\u539F\u5E02\u5357\u533A\u53E4\u6DF52-17-15 2F\u30FB3F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop82033.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10540",
      name: "BOOKOFF \u76F8\u6A21\u5927\u91CE\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u76F8\u6A21\u539F\u5E02\u5357\u533A\u76F8\u6A21\u5927\u91CE5-30-7",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10540.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10771",
      name: "BOOKOFF \u6A2A\u9808\u8CC0\u4E2D\u592E\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u9808\u8CC0\u5E02\u5927\u6EDD\u753A2-25",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10771.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10844",
      name: "BOOKOFF \u6A2A\u9808\u8CC0\u4F50\u539F\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u9808\u8CC0\u5E02\u7C9F\u75302-1-3",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10844.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10613",
      name: "BOOKOFF \u6A2A\u9808\u8CC0\u5800\u30CE\u5185\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6A2A\u9808\u8CC0\u5E02\u4E09\u6625\u753A3-13-7",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10613.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10392",
      name: "BOOKOFF \u5E73\u585A\u99C5\u897F\u53E3\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5E73\u585A\u5E02\u7D05\u8C37\u753A16-4",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10392.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop80213",
      name: "\u3042\u305D\u30D3\u30D0 \u5E73\u585A\u56DB\u4E4B\u5BAE\u5E97",
      brandType: "\u3042\u305D\u30D3\u30D0",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5E73\u585A\u5E02\u56DB\u4E4B\u5BAE3-9-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop80213.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20278",
      name: "BOOKOFF \u5E73\u585A\u8C4A\u7530\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5E73\u585A\u5E02\u8C4A\u7530\u672C\u90F71731",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20278.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20421",
      name: "BOOKOFF SUPER BAZAAR \u938C\u5009\u5927\u8239\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u938C\u5009\u5E02\u5927\u82396-1-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20421.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10731",
      name: "BOOKOFF \u938C\u5009\u624B\u5E83\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u938C\u5009\u5E02\u624B\u5E836-2-14",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10731.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20281",
      name: "BOOKOFF PLUS \u85E4\u6CA2\u5927\u5EAD\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u85E4\u6CA2\u5E02\u5927\u5EAD5454-5",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20281.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10481",
      name: "BOOKOFF \u85E4\u6CA2\u516D\u4F1A\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u85E4\u6CA2\u5E02\u4E80\u4E95\u91CE2-25-11",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10481.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20470",
      name: "BOOKOFF SUPER BAZAAR Luz\u6E58\u5357\u8FBB\u5802\u5E97",
      brandType: "BOOKOFF SUPER BAZAAR",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u85E4\u6CA2\u5E02\u8FBB\u5802\u795E\u53F01-2-12 Luz\u6E58\u5357\u8FBB\u58023F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20470.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20105",
      name: "BOOKOFF \u85E4\u6CA2\u7528\u7530\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u85E4\u6CA2\u5E02\u7528\u7530491-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20105.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10535",
      name: "BOOKOFF \u5C0F\u7530\u539F\u86CD\u7530\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5C0F\u7530\u539F\u5E02\u98EF\u7530\u5CA139",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10535.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20205",
      name: "BOOKOFF \u8305\u30F6\u5D0E\u99C5\u5317\u53E3\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u8305\u30F6\u5D0E\u5E02\u65B0\u6804\u753A2-8 \u5171\u548C\u30D3\u30EB",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20205.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10807",
      name: "BOOKOFF \u9017\u5B50\u4E45\u6728\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u9017\u5B50\u5E02\u4E45\u67284-13-25",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10807.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10265",
      name: "BOOKOFF \u79E6\u91CE\u6E0B\u6CA2\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u79E6\u91CE\u5E02\u5E73\u6CA2363-3",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10265.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10063",
      name: "BOOKOFF \u539A\u6728\u59BB\u7530\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u539A\u6728\u5E02\u59BB\u7530\u53171-12-21",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10063.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10848",
      name: "BOOKOFF \u539A\u6728\u6238\u5BA4\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u539A\u6728\u5E02\u6238\u5BA41-28-17",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10848.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20480",
      name: "BOOKOFF PLUS \u30A2\u30DF\u30E5\u30FC\u3042\u3064\u304E\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u539A\u6728\u5E02\u4E2D\u753A2-12-15 \u30A2\u30DF\u30E5\u30FC\u3042\u3064\u304E4F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20480.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop40405",
      name: "Japan TCG Center \u672C\u539A\u6728\u99C5\u524D\u5E97",
      brandType: "Japan TCG Center",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u539A\u6728\u5E02\u4E2D\u753A2-2-8 \u539A\u6728\u30BB\u30F3\u30BF\u30FC\u30D3\u30EB6F",
      officialUrl: "https://www.bookoff.co.jp/shop/shop40405.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20128",
      name: "BOOKOFF \u5927\u548C\u3064\u304D\u307F\u91CE\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5927\u548C\u5E02\u3064\u304D\u307F\u91CE4-12-3",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20128.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20179",
      name: "BOOKOFF \u5927\u548C\u897F\u9DB4\u9593\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5927\u548C\u5E02\u897F\u9DB4\u95931-17-2",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20179.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20020",
      name: "BOOKOFF PLUS \u4F0A\u52E2\u539F\u5E97",
      brandType: "BOOKOFF PLUS",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u4F0A\u52E2\u539F\u5E02\u4F0A\u52E2\u539F3-5-1",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20020.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20203",
      name: "BOOKOFF \u6D77\u8001\u540D\u3055\u304C\u307F\u91CE\u99C5\u524D\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u6D77\u8001\u540D\u5E02\u6771\u67CF\u30B1\u8C372-25-25",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20203.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20298",
      name: "BOOKOFF \u5EA7\u9593\u8B66\u5BDF\u7F72\u524D\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u5EA7\u9593\u5E02\u5165\u8C37\u897F2\u4E01\u76EE60-11",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20298.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop20418",
      name: "BOOKOFF \u5BD2\u5DDD\u5927\u66F2\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u9AD8\u5EA7\u90E1\u5BD2\u5DDD\u753A\u5927\u66F23-11-5",
      officialUrl: "https://www.bookoff.co.jp/shop/shop20418.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    },
    {
      officialId: "shop10750",
      name: "BOOKOFF \u5927\u4E95\u677E\u7530\u5E97",
      brandType: "BOOKOFF",
      prefecture: "\u795E\u5948\u5DDD\u770C",
      address: "\u795E\u5948\u5DDD\u770C\u8DB3\u67C4\u4E0A\u90E1\u5927\u4E95\u753A\u91D1\u5B50312",
      officialUrl: "https://www.bookoff.co.jp/shop/shop10750.html",
      sourceUrl: "https://www.bookoff.co.jp/shop/pref-list/14.html"
    }
  ]
};

// src/server/seed.ts
var DEFAULT_SETTINGS = {
  marketplaces: {
    mercari: { feeRatePercent: 10, shipping: 210 },
    yahoo_fleamarket: { feeRatePercent: 5, shipping: 210 },
    // Amazon.co.jp 中古（自己発送想定）。メディアは15%・最低手数料なし＋カテゴリー成約料（本80円、CD・DVD140円）。
    // それ以外は保守的に「その他のカテゴリー」15%・最低30円。実際の料率はカテゴリーで異なるため設定画面で調整する。
    amazon_used: {
      feeRatePercent: 15,
      shipping: 210,
      categoryFees: {
        \u672C: { fixedFee: 80 },
        CD: { fixedFee: 140 },
        "DVD\u30FBBD": { fixedFee: 140 },
        \u30B2\u30FC\u30E0: {},
        \u30DB\u30D3\u30FC: { minFee: 30 },
        \u5BB6\u96FB: { minFee: 30 },
        \u305D\u306E\u4ED6: { minFee: 30 }
      }
    }
  },
  otherCost: 0,
  priceTypePriority: ["estimate", "sold", "listing"],
  rounding: "floor",
  stockFreshDays: 3
};
var STORE_SEED_SOURCE = stores_seed_default.source;
var STORE_SEED_VERIFIED_AT = stores_seed_default.verifiedAt;
function seedStores(repo) {
  let n = 0;
  repo.tx(() => {
    for (const s of stores_seed_default.stores) {
      if (!PREFECTURES.includes(s.prefecture)) continue;
      const brandType = detectBrandType(s.name);
      const { action } = repo.upsertStore({
        officialId: s.officialId,
        name: s.name,
        brandType,
        prefecture: s.prefecture,
        address: s.address,
        officialUrl: s.officialUrl,
        status: "\u55B6\u696D\u4E2D",
        verifiedAt: stores_seed_default.verifiedAt,
        source: `${stores_seed_default.source}\uFF08${s.sourceUrl}\uFF09`,
        note: BRAND_NOTES[brandType] ?? null
      });
      if (action === "inserted") n++;
    }
  });
  return n;
}
function withDefaults(s) {
  return { ...DEFAULT_SETTINGS, ...s, marketplaces: { ...DEFAULT_SETTINGS.marketplaces, ...s.marketplaces } };
}
function ensureSettings(repo) {
  const cur = repo.getSettings();
  if (!cur) repo.saveSettings(DEFAULT_SETTINGS);
  else if (Object.keys(DEFAULT_SETTINGS.marketplaces).some((k) => !(k in cur.marketplaces))) repo.saveSettings(withDefaults(cur));
}
var DEMO_ITEMS = [
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u63A8\u7406\u5C0F\u8AAC \u6587\u5EAB \u4E0A\u4E0B\u5DFB\u30BB\u30C3\u30C8",
    category: "\u672C",
    isbn: "9780000000011",
    listPrice: 1540,
    offers: [
      { store: "shop10145", price: 220, status: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u76EE\u7ACB\u3063\u305F\u50B7\u306A\u3057", daysAgo: 1 },
      { store: "shop20290", price: 330, status: "\u5728\u5EAB\u672A\u78BA\u8A8D", condition: "\u72B6\u614B\u672A\u78BA\u8A8D", daysAgo: null }
    ],
    mercari: { sold: 900, listing: 1100 },
    yahoo: { sold: 850 },
    amazon: { listing: 1280, estimate: 1150 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u8CC7\u683C\u8A66\u9A13 \u5BFE\u7B56\u554F\u984C\u96C6 2026\u5E74\u7248",
    category: "\u672C",
    isbn: "9780000000028",
    listPrice: 3080,
    offers: [{ store: "shop10259", price: 1100, status: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u3084\u3084\u50B7\u3042\u308A", daysAgo: 2 }],
    mercari: { sold: 2400, estimate: 2300 },
    yahoo: { listing: 2600 },
    amazon: { listing: 3100, estimate: 2900 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u5BB6\u5EAD\u7528\u30B2\u30FC\u30E0\u30BD\u30D5\u30C8 \u30A2\u30AF\u30B7\u30E7\u30F3RPG",
    category: "\u30B2\u30FC\u30E0",
    jan: "4900000000010",
    listPrice: 7678,
    offers: [
      { store: "shop20467", price: 2980, status: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u76EE\u7ACB\u3063\u305F\u50B7\u306A\u3057", daysAgo: 0 },
      { store: "shop20545", price: 3280, status: "\u5728\u5EAB\u672A\u78BA\u8A8D", condition: "\u72B6\u614B\u672A\u78BA\u8A8D", daysAgo: null }
    ],
    mercari: { sold: 4600 },
    yahoo: { sold: 4400, listing: 4980 },
    amazon: { listing: 4300 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u643A\u5E2F\u30B2\u30FC\u30E0\u6A5F\u7528\u30BD\u30D5\u30C8 \u30D1\u30BA\u30EB",
    category: "\u30B2\u30FC\u30E0",
    jan: "4900000000027",
    offers: [{ store: "shop10219", price: 1650, status: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u76EE\u7ACB\u3063\u305F\u50B7\u306A\u3057", daysAgo: 3 }],
    mercari: { sold: 1500 },
    yahoo: { sold: 1600 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u30A2\u30CB\u30E1 Blu-ray BOX \u5168\u8A71\u53CE\u9332",
    category: "DVD\u30FBBD",
    jan: "4900000000034",
    listPrice: 8800,
    offers: [{ store: "shop20120", price: 5500, status: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u76EE\u7ACB\u3063\u305F\u50B7\u306A\u3057", daysAgo: 1 }],
    mercari: { sold: 9800, estimate: 9500 },
    amazon: { listing: 12800, estimate: 11800 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u6D0B\u697D \u30D9\u30B9\u30C8\u30A2\u30EB\u30D0\u30E0 \u9650\u5B9A\u76E4CD",
    category: "CD",
    jan: "4900000000041",
    listPrice: 1650,
    offers: [{ store: "shop10546", price: 550, status: "\u5728\u5EAB\u672A\u78BA\u8A8D", condition: "\u72B6\u614B\u672A\u78BA\u8A8D", daysAgo: null }],
    yahoo: { listing: 1800 },
    amazon: { listing: 2480, estimate: 2200 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB 1/144 \u30D7\u30E9\u30E2\u30C7\u30EB \u672A\u7D44\u7ACB",
    category: "\u30DB\u30D3\u30FC",
    jan: "4900000000058",
    offers: [{ store: "shop20270", price: 1980, status: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u65B0\u54C1", daysAgo: 0 }],
    mercari: { sold: 3500 },
    yahoo: { sold: 3300 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u30EF\u30A4\u30E4\u30EC\u30B9\u30A4\u30E4\u30DB\u30F3 \u5145\u96FB\u30B1\u30FC\u30B9\u4ED8",
    category: "\u5BB6\u96FB",
    jan: "4900000000065",
    offers: [{ store: "shop20431", price: 4400, status: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u3084\u3084\u50B7\u3042\u308A", daysAgo: 5 }],
    mercari: { sold: 4200 },
    yahoo: { listing: 4500 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u5199\u771F\u96C6 \u521D\u7248 \u5E2F\u4ED8\u304D",
    category: "\u672C",
    isbn: "9780000000035",
    listPrice: 2750,
    offers: [{ store: "shop20316", price: 770, status: "\u5728\u5EAB\u306A\u3057\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u76EE\u7ACB\u3063\u305F\u50B7\u306A\u3057", daysAgo: 4 }],
    mercari: { sold: 2800 },
    amazon: { listing: 4980, estimate: 4600 }
  },
  {
    name: "\u30B5\u30F3\u30D7\u30EB \u6620\u753B DVD \u30B7\u30EA\u30FC\u30BA3\u4F5C\u30BB\u30C3\u30C8",
    category: "DVD\u30FBBD",
    jan: "4900000000072",
    listPrice: 4180,
    offers: [{ store: "shop10050", price: 990, status: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", condition: "\u76EE\u7ACB\u3063\u305F\u50B7\u306A\u3057", daysAgo: 2 }],
    amazon: { listing: 1580, estimate: 1500 }
  }
];
function seedDemo(repo) {
  const now = Date.now();
  const iso = (daysAgo, hour = 12) => new Date(now - daysAgo * 864e5 - (12 - hour) * 36e5).toISOString();
  let n = 0;
  repo.tx(() => {
    for (const d of DEMO_ITEMS) {
      const existing = repo.findProduct({ jan: d.jan, isbn: d.isbn, name: d.name, isDemo: true });
      if (existing) continue;
      const p = repo.insertProduct({
        name: d.name,
        category: d.category,
        jan: d.jan ?? null,
        isbn: d.isbn ?? null,
        source: "\u30C7\u30E2\u30C7\u30FC\u30BF\uFF08\u67B6\u7A7A\uFF09",
        isDemo: true,
        listPrice: d.listPrice ?? null
      });
      n++;
      for (const o of d.offers) {
        const store = repo.findStoreByOfficialId(o.store);
        repo.insertOffer({
          productId: p.id,
          storeId: store?.id ?? null,
          price: o.price,
          condition: o.condition,
          stockStatus: o.status,
          checkedAt: o.daysAgo == null ? null : iso(o.daysAgo, 10),
          source: "\u30C7\u30E2\u30C7\u30FC\u30BF\uFF08\u67B6\u7A7A\uFF09",
          isDemo: true
        });
      }
      const add = (marketplace, v) => {
        if (!v) return;
        for (const t of ["listing", "sold", "estimate"]) {
          const price2 = v[t];
          if (price2 == null) continue;
          repo.insertPrice({
            productId: p.id,
            marketplace,
            priceType: t,
            price: price2,
            sampleCount: t === "listing" ? 1 : 5,
            observedAt: iso(t === "sold" ? 1 : 0, 9),
            source: "\u30C7\u30E2\u30C7\u30FC\u30BF\uFF08\u67B6\u7A7A\uFF09",
            isDemo: true
          });
        }
      };
      add("mercari", d.mercari);
      add("yahoo_fleamarket", d.yahoo);
      add("amazon_used", d.amazon);
    }
  });
  return n;
}

// src/server/service.ts
function getSettings(repo) {
  const s = repo.getSettings();
  return s ? withDefaults(s) : DEFAULT_SETTINGS;
}
var maxIso = (...vals) => vals.filter((v) => !!v).sort().at(-1) ?? null;
function buildRows(repo, now = Date.now()) {
  const settings = getSettings(repo);
  const stores = new Map(repo.listStores().map((s) => [s.id, s]));
  const offersByProduct = /* @__PURE__ */ new Map();
  for (const o of repo.listOffers()) {
    const list = offersByProduct.get(o.productId) ?? [];
    list.push(o);
    offersByProduct.set(o.productId, list);
  }
  const pricesByProduct = /* @__PURE__ */ new Map();
  for (const p of repo.listPrices()) {
    const list = pricesByProduct.get(p.productId) ?? [];
    list.push(p);
    pricesByProduct.set(p.productId, list);
  }
  const rows = [];
  for (const product of repo.listProducts()) {
    const prices = pricesByProduct.get(product.id) ?? [];
    const latestMarketObservedAt = maxIso(...prices.map((p) => p.observedAt));
    const offers = offersByProduct.get(product.id) ?? [null];
    for (const offer of offers) {
      const { markets, best, bestProfit } = summarizeMarkets({
        prices,
        purchasePrice: offer?.price ?? null,
        settings,
        shippingOverride: product.shippingOverride,
        otherCostOverride: product.otherCostOverride,
        category: product.category
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
        premium: premiumOf(product.listPrice, markets.amazon_used?.chosen?.price ?? null, offer?.price ?? null, fleaSoldOf(markets))
      });
    }
  }
  return rows;
}
function queryItems(repo, f) {
  const all = buildRows(repo);
  const rows = sortRows(applyFilters(all, f), f.sort, f.marketplace);
  return { rows, total: all.length };
}
function summarizeStores(repo, dataKind = "all", now = Date.now()) {
  const rows = applyFilters(buildRows(repo, now), { dataKind, profitOnly: false });
  const by = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (!r.store) continue;
    const s = by.get(r.store.id) ?? { storeId: r.store.id, profitable: 0, profitableInStock: 0, profitableUnconfirmed: 0, profitableStale: 0, premiumBoth: 0, profitSumInStock: 0, lastCheckedAt: null };
    const checked = r.offer?.checkedAt ?? null;
    if (checked && (!s.lastCheckedAt || checked > s.lastCheckedAt)) s.lastCheckedAt = checked;
    const profit = r.bestProfit?.profit ?? 0;
    if (profit > 0) {
      s.profitable++;
      const st = r.stock.status;
      if (st === "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09") {
        s.profitableInStock++;
        s.profitSumInStock += profit;
      }
      if (st === "\u5728\u5EAB\u672A\u78BA\u8A8D") s.profitableUnconfirmed++;
      if (st === "\u8981\u518D\u78BA\u8A8D") s.profitableStale++;
      if (r.premium.bothOverList && r.premium.buyAtOrBelowList) s.premiumBoth++;
    }
    by.set(r.store.id, s);
  }
  return [...by.values()];
}

// src/shared/csv.ts
function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}
function parseCsvRecords(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((r, i) => {
    const values = {};
    headers.forEach((h, j) => {
      values[h] = (r[j] ?? "").trim();
    });
    return { line: i + 2, values };
  });
  return { headers, records };
}
function escapeField(v) {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
function toCsv(headers, rows, withBom = true) {
  const body = [headers, ...rows].map((r) => r.map(escapeField).join(",")).join("\r\n");
  return (withBom ? "\uFEFF" : "") + body + "\r\n";
}

// src/shared/format.ts
function jstDateTime(iso) {
  if (!iso) return NA;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return NA;
  const d = new Date(t + 9 * 3600 * 1e3);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// src/server/importers.ts
var ALIASES = {
  name: ["\u5546\u54C1\u540D", "name", "title"],
  jan: ["JAN", "JAN\u30B3\u30FC\u30C9", "jan"],
  isbn: ["ISBN", "ISBN\u30B3\u30FC\u30C9", "isbn"],
  category: ["\u30AB\u30C6\u30B4\u30EA", "category"],
  imageUrl: ["\u753B\u50CFURL", "image_url", "imageUrl"],
  storeId: ["\u5E97\u8217ID", "\u516C\u5F0F\u5E97\u8217ID", "store_id", "official_id"],
  storeName: ["\u5E97\u8217\u540D", "\u5728\u5EAB\u5E97\u8217", "store", "store_name"],
  price: ["BOOKOFF\u4FA1\u683C", "\u4ED5\u5165\u308C\u4FA1\u683C", "\u4FA1\u683C", "price"],
  listPrice: ["\u5B9A\u4FA1", "\u5B9A\u4FA1\uFF08\u7A0E\u8FBC\uFF09", "\u5B9A\u4FA1(\u7A0E\u8FBC)", "list_price"],
  stockStatus: ["\u5728\u5EAB\u72B6\u614B", "stock_status"],
  condition: ["\u5546\u54C1\u72B6\u614B", "condition"],
  checkedAt: ["\u5728\u5EAB\u78BA\u8A8D\u65E5\u6642", "checked_at"],
  source: ["\u60C5\u5831\u53D6\u5F97\u5143", "source"],
  marketplace: ["\u8CA9\u8DEF", "marketplace"],
  priceType: ["\u4FA1\u683C\u7A2E\u5225", "price_type"],
  sampleCount: ["\u30B5\u30F3\u30D7\u30EB\u6570", "sample_count"],
  observedAt: ["\u53D6\u5F97\u65E5\u6642", "\u89B3\u6E2C\u65E5\u6642", "observed_at"],
  note: ["\u5099\u8003", "note"],
  prefecture: ["\u90FD\u9053\u5E9C\u770C", "prefecture"],
  address: ["\u6240\u5728\u5730", "\u4F4F\u6240", "address"],
  brandType: ["\u5E97\u8217\u7A2E\u5225", "\u696D\u614B", "brand_type"],
  officialUrl: ["\u516C\u5F0FURL", "official_url", "url"],
  status: ["\u72B6\u614B", "\u5E97\u8217\u72B6\u614B", "status"],
  successorId: ["\u5F8C\u7D99\u5E97\u8217ID", "successor_id"],
  verifiedAt: ["\u78BA\u8A8D\u65E5\u6642", "verified_at"]
};
function canon(rec) {
  const out = {};
  for (const [key, names] of Object.entries(ALIASES)) {
    for (const n of names) {
      const v = rec.values[n];
      if (v !== void 0 && v !== "") {
        out[key] = v;
        break;
      }
    }
  }
  return out;
}
var digitsOnly = (s) => s.normalize("NFKC").replace(/[-\s]/g, "");
var janSchema = external_exports.string().transform(digitsOnly).refine((v) => /^\d{8}$|^\d{13}$/.test(v), "JAN\u306F8\u6841\u307E\u305F\u306F13\u6841\u306E\u6570\u5B57");
var isbnSchema = external_exports.string().transform(digitsOnly).refine((v) => /^\d{9}[\dX]$|^\d{13}$/i.test(v), "ISBN\u306F10\u6841\u307E\u305F\u306F13\u6841");
var yenSchema = external_exports.string().transform((v) => v.normalize("NFKC").replace(/[¥,円\s]/g, "")).refine((v) => /^\d+$/.test(v), "\u4FA1\u683C\u306F0\u4EE5\u4E0A\u306E\u6574\u6570\uFF08\u5186\uFF09").transform(Number);
function parseJstDate(v) {
  const s = v.normalize("NFKC").trim().replace(/\//g, "-");
  if (!s) return null;
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  const base = /^\d{4}-\d{1,2}-\d{1,2}$/.test(s) ? `${s}T00:00:00` : s.replace(" ", "T");
  const normalized = base.replace(/^(\d{4})-(\d{1,2})-(\d{1,2})/, (_, y, m, d) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`).replace(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/, (_, h, mi, se) => `T${h.padStart(2, "0")}:${mi}:${se ?? "00"}`);
  const t = Date.parse(hasTz ? normalized : `${normalized}+09:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
function parseMarketplace(v) {
  const s = v.normalize("NFKC").trim().toLowerCase();
  if (FORBIDDEN_MARKETPLACE_WORDS.some((w) => s.includes(w.toLowerCase()))) return "forbidden";
  if (["\u30E1\u30EB\u30AB\u30EA", "mercari"].includes(s)) return "mercari";
  if (["yahoo!\u30D5\u30EA\u30DE", "yahoo\u30D5\u30EA\u30DE", "yahoo_fleamarket", "paypay\u30D5\u30EA\u30DE", "\u30E4\u30D5\u30FC\u30D5\u30EA\u30DE"].includes(s)) return "yahoo_fleamarket";
  if (["amazon\u4E2D\u53E4", "amazon", "amazon_used", "\u30A2\u30DE\u30BE\u30F3\u4E2D\u53E4", "\u30A2\u30DE\u30BE\u30F3", "amazon(\u4E2D\u53E4)"].includes(s)) return "amazon_used";
  return null;
}
function parsePriceType(v) {
  const s = v.normalize("NFKC").trim().toLowerCase();
  if (["\u51FA\u54C1\u4FA1\u683C", "\u51FA\u54C1", "listing"].includes(s)) return "listing";
  if (["\u58F2\u5374\u6E08\u307F\u4FA1\u683C", "\u58F2\u5374\u6E08\u307F", "\u58F2\u5207", "\u58F2\u308A\u5207\u308C", "sold"].includes(s)) return "sold";
  if (["\u63A8\u5B9A\u76F8\u5834", "\u76F8\u5834", "estimate"].includes(s)) return "estimate";
  return null;
}
function emptyResult(kind, total) {
  return { kind, total, inserted: 0, updated: 0, skipped: 0, errors: [] };
}
function resolveProduct(repo, c, source, line, res) {
  const jan = c.jan ? janSchema.safeParse(c.jan) : null;
  const isbn = c.isbn ? isbnSchema.safeParse(c.isbn) : null;
  if (jan && !jan.success) {
    res.errors.push({ line, message: jan.error.issues[0].message });
    return null;
  }
  if (isbn && !isbn.success) {
    res.errors.push({ line, message: isbn.error.issues[0].message });
    return null;
  }
  if (!c.name && !jan && !isbn) {
    res.errors.push({ line, message: "\u5546\u54C1\u540D\u30FBJAN\u30FBISBN\u306E\u3044\u305A\u308C\u304B\u304C\u5FC5\u8981\u3067\u3059" });
    return null;
  }
  const category = c.category && CATEGORIES.includes(c.category) ? c.category : "\u305D\u306E\u4ED6";
  if (c.category && category !== c.category) {
    res.errors.push({ line, message: `\u30AB\u30C6\u30B4\u30EA\u300C${c.category}\u300D\u306F\u7121\u52B9\u3067\u3059\uFF08${CATEGORIES.join("\uFF0F")}\uFF09` });
    return null;
  }
  const janV = jan?.success ? jan.data : null;
  const isbnV = isbn?.success ? isbn.data : null;
  let listPrice = null;
  if (c.listPrice) {
    const lp = yenSchema.safeParse(c.listPrice);
    if (!lp.success || lp.data <= 0) {
      res.errors.push({ line, message: "\u5B9A\u4FA1\u306F1\u5186\u4EE5\u4E0A\u306E\u6574\u6570\uFF08\u5186\uFF09" });
      return null;
    }
    listPrice = lp.data;
  }
  const found = repo.findProduct({ jan: janV, isbn: isbnV, name: c.name, isDemo: false });
  if (found) {
    if (c.name || c.category || c.imageUrl || listPrice != null) {
      repo.updateProduct(found.id, {
        name: c.name || found.name,
        jan: janV,
        isbn: isbnV,
        category: c.category ? category : found.category,
        imageUrl: c.imageUrl || null,
        source,
        listPrice,
        listPriceSource: listPrice != null ? source : null
      });
    }
    return { product: found, created: false };
  }
  if (!c.name) {
    res.errors.push({ line, message: "\u65B0\u898F\u5546\u54C1\u306B\u306F\u5546\u54C1\u540D\u304C\u5FC5\u8981\u3067\u3059" });
    return null;
  }
  return { product: repo.insertProduct({ name: c.name, jan: janV, isbn: isbnV, category, imageUrl: c.imageUrl || null, source, listPrice, listPriceSource: source }), created: true };
}
function importProducts(repo, text, filename) {
  const { records } = parseCsvRecords(text);
  const res = emptyResult("products", records.length);
  const source = `CSV\u53D6\u8FBC\uFF08${filename}\uFF09`;
  repo.tx(() => {
    for (const rec of records) {
      const c = canon(rec);
      const startErrors = res.errors.length;
      let storeId = null;
      if (c.storeId || c.storeName) {
        const st = c.storeId ? repo.findStoreByOfficialId(c.storeId.startsWith("shop") ? c.storeId : `shop${c.storeId}`) : repo.findStoreByName(c.storeName);
        if (!st) {
          res.errors.push({ line: rec.line, message: `\u5E97\u8217\u300C${c.storeId ?? c.storeName}\u300D\u304C\u5E97\u8217\u30DE\u30B9\u30BF\uFF083\u770C\uFF09\u306B\u3042\u308A\u307E\u305B\u3093` });
          res.skipped++;
          continue;
        }
        storeId = st.id;
      }
      let price2 = null;
      if (c.price) {
        const p = yenSchema.safeParse(c.price);
        if (!p.success) {
          res.errors.push({ line: rec.line, message: p.error.issues[0].message });
          res.skipped++;
          continue;
        }
        price2 = p.data;
      }
      let stockStatus = "\u5728\u5EAB\u672A\u78BA\u8A8D";
      if (c.stockStatus) {
        const map = { \u5728\u5EAB\u3042\u308A: "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", \u5728\u5EAB\u306A\u3057: "\u5728\u5EAB\u306A\u3057\uFF08\u78BA\u8A8D\u6E08\uFF09", \u672A\u78BA\u8A8D: "\u5728\u5EAB\u672A\u78BA\u8A8D" };
        const s = STOCK_STATUSES.includes(c.stockStatus) ? c.stockStatus : map[c.stockStatus];
        if (!s) {
          res.errors.push({ line: rec.line, message: `\u5728\u5EAB\u72B6\u614B\u300C${c.stockStatus}\u300D\u306F\u7121\u52B9\u3067\u3059\uFF08${STOCK_STATUSES.join("\uFF0F")}\uFF09` });
          res.skipped++;
          continue;
        }
        stockStatus = s;
      }
      let checkedAt = null;
      if (c.checkedAt) {
        checkedAt = parseJstDate(c.checkedAt);
        if (!checkedAt) {
          res.errors.push({ line: rec.line, message: `\u5728\u5EAB\u78BA\u8A8D\u65E5\u6642\u300C${c.checkedAt}\u300D\u3092\u89E3\u91C8\u3067\u304D\u307E\u305B\u3093` });
          res.skipped++;
          continue;
        }
      }
      if (stockStatus !== "\u5728\u5EAB\u672A\u78BA\u8A8D" && !checkedAt) stockStatus = "\u5728\u5EAB\u672A\u78BA\u8A8D";
      const prod = resolveProduct(repo, c, c.source ? `${c.source}\uFF08${filename}\uFF09` : source, rec.line, res);
      if (!prod) {
        if (res.errors.length > startErrors) res.skipped++;
        continue;
      }
      if (storeId != null || price2 != null) {
        const { action } = repo.upsertOffer({
          productId: prod.product.id,
          storeId,
          price: price2,
          condition: c.condition || "\u72B6\u614B\u672A\u78BA\u8A8D",
          stockStatus,
          checkedAt,
          source: c.source ? `${c.source}\uFF08${filename}\uFF09` : source
        });
        if (prod.created || action === "inserted") res.inserted++;
        else res.updated++;
      } else if (prod.created) res.inserted++;
      else res.updated++;
    }
  });
  return res;
}
function importMarket(repo, text, filename) {
  const { records } = parseCsvRecords(text);
  const res = emptyResult("market", records.length);
  repo.tx(() => {
    for (const rec of records) {
      const c = canon(rec);
      const fail = (message) => {
        res.errors.push({ line: rec.line, message });
        res.skipped++;
      };
      const mp = c.marketplace ? parseMarketplace(c.marketplace) : null;
      if (mp === "forbidden") {
        fail(`\u8CA9\u8DEF\u300C${c.marketplace}\u300D\u306F\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093\uFF08Yahoo!\u30AA\u30FC\u30AF\u30B7\u30E7\u30F3\u30FBYahoo!\u30B7\u30E7\u30C3\u30D4\u30F3\u30B0\u306F\u76F8\u5834\u306E\u4EE3\u66FF\u306B\u4F7F\u308F\u306A\u3044\uFF09`);
        continue;
      }
      if (!mp) {
        fail(`\u8CA9\u8DEF\u306F ${MARKETPLACES.map((m) => MARKETPLACE_LABEL[m]).join("\uFF0F")} \u306E\u3044\u305A\u308C\u304B\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044`);
        continue;
      }
      const pt = c.priceType ? parsePriceType(c.priceType) : null;
      if (!pt) {
        fail(`\u4FA1\u683C\u7A2E\u5225\u306F ${Object.values(PRICE_TYPE_LABEL).join("\uFF0F")} \u306E\u3044\u305A\u308C\u304B\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044`);
        continue;
      }
      const price2 = yenSchema.safeParse(c.price ?? "");
      if (!price2.success || price2.data <= 0) {
        fail("\u4FA1\u683C\u306F1\u5186\u4EE5\u4E0A\u306E\u6574\u6570\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044");
        continue;
      }
      const observedAt = c.observedAt ? parseJstDate(c.observedAt) : null;
      if (!observedAt) {
        fail("\u53D6\u5F97\u65E5\u6642\u304C\u5FC5\u8981\u3067\u3059\uFF08\u4F8B\uFF1A2026-11-20 10:30\uFF09");
        continue;
      }
      let sampleCount = null;
      if (c.sampleCount) {
        const n = Number(c.sampleCount);
        if (!Number.isInteger(n) || n < 0) {
          fail("\u30B5\u30F3\u30D7\u30EB\u6570\u306F0\u4EE5\u4E0A\u306E\u6574\u6570");
          continue;
        }
        sampleCount = n;
      }
      const before = res.errors.length;
      const prod = resolveProduct(repo, c, `CSV\u53D6\u8FBC\uFF08${filename}\uFF09`, rec.line, res);
      if (!prod) {
        if (res.errors.length > before) res.skipped++;
        continue;
      }
      const { duplicate } = repo.insertPrice({
        productId: prod.product.id,
        marketplace: mp,
        priceType: pt,
        price: price2.data,
        sampleCount,
        observedAt,
        source: c.source ? `${c.source}\uFF08${filename}\uFF09` : `CSV\u53D6\u8FBC\uFF08${filename}\uFF09`,
        note: c.note || null
      });
      if (duplicate) res.skipped++;
      else res.inserted++;
    }
  });
  return res;
}
function importStores(repo, text, filename) {
  const { records } = parseCsvRecords(text);
  const res = emptyResult("stores", records.length);
  repo.tx(() => {
    for (const rec of records) {
      const c = canon(rec);
      c.name = c.storeName ?? c.name;
      const fail = (message) => {
        res.errors.push({ line: rec.line, message });
        res.skipped++;
      };
      if (!c.name) {
        fail("\u5E97\u8217\u540D\u304C\u5FC5\u8981\u3067\u3059");
        continue;
      }
      if (!c.prefecture || !PREFECTURES.includes(c.prefecture)) {
        fail(`\u90FD\u9053\u5E9C\u770C\u306F ${PREFECTURES.join("\uFF0F")} \u306E\u307F\u5BFE\u8C61\u3067\u3059`);
        continue;
      }
      if (!c.address) {
        fail("\u6240\u5728\u5730\u304C\u5FC5\u8981\u3067\u3059");
        continue;
      }
      if (!c.address.startsWith(c.prefecture)) {
        fail("\u6240\u5728\u5730\u304C\u90FD\u9053\u5E9C\u770C\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093");
        continue;
      }
      const brandType = c.brandType ?? detectBrandType(c.name);
      if (!BRAND_TYPES.includes(brandType)) {
        fail(`\u5E97\u8217\u7A2E\u5225\u300C${c.brandType}\u300D\u306F\u7121\u52B9\u3067\u3059`);
        continue;
      }
      const status = c.status ?? "\u55B6\u696D\u4E2D";
      if (!STORE_STATUSES.includes(status)) {
        fail(`\u72B6\u614B\u306F ${STORE_STATUSES.join("\uFF0F")} \u306E\u3044\u305A\u308C\u304B`);
        continue;
      }
      if (c.officialUrl && !/^https:\/\/www\.bookoff\.co\.jp\//.test(c.officialUrl)) {
        fail("\u516C\u5F0FURL\u306F https://www.bookoff.co.jp/ \u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059");
        continue;
      }
      const verifiedAt = c.verifiedAt ? parseJstDate(c.verifiedAt) : null;
      if (c.verifiedAt && !verifiedAt) {
        fail("\u78BA\u8A8D\u65E5\u6642\u3092\u89E3\u91C8\u3067\u304D\u307E\u305B\u3093");
        continue;
      }
      const officialId = c.storeId ? c.storeId.startsWith("shop") ? c.storeId : `shop${c.storeId}` : null;
      const successorOfficialId = c.successorId ? c.successorId.startsWith("shop") ? c.successorId : `shop${c.successorId}` : null;
      const { action } = repo.upsertStore({
        officialId,
        name: c.name,
        brandType,
        prefecture: c.prefecture,
        address: c.address,
        officialUrl: c.officialUrl ?? (officialId ? `https://www.bookoff.co.jp/shop/${officialId}.html` : null),
        status,
        successorOfficialId,
        verifiedAt,
        source: `CSV\u53D6\u8FBC\uFF08${filename}\uFF09`,
        note: c.note ?? BRAND_NOTES[brandType] ?? null
      });
      if (action === "inserted") res.inserted++;
      else if (action === "updated") res.updated++;
      else res.skipped++;
    }
  });
  return res;
}
var TEMPLATES = {
  products: toCsv(["\u5546\u54C1\u540D", "JAN", "ISBN", "\u30AB\u30C6\u30B4\u30EA", "\u5B9A\u4FA1", "\u753B\u50CFURL", "\u5E97\u8217ID", "\u5E97\u8217\u540D", "BOOKOFF\u4FA1\u683C", "\u5728\u5EAB\u72B6\u614B", "\u5546\u54C1\u72B6\u614B", "\u5728\u5EAB\u78BA\u8A8D\u65E5\u6642", "\u60C5\u5831\u53D6\u5F97\u5143"], [
    ["\uFF08\u4F8B\uFF09\u5546\u54C1\u540D\u3092\u3053\u3053\u306B", "", "9784000000000", "\u672C", "1980", "", "shop10145", "", "220", "\u5728\u5EAB\u3042\u308A\uFF08\u78BA\u8A8D\u6E08\uFF09", "\u76EE\u7ACB\u3063\u305F\u50B7\u306A\u3057", "2026-11-20 10:30", "\u5E97\u982D\u3067\u76EE\u8996\u78BA\u8A8D"]
  ]),
  market: toCsv(["\u5546\u54C1\u540D", "JAN", "ISBN", "\u8CA9\u8DEF", "\u4FA1\u683C\u7A2E\u5225", "\u4FA1\u683C", "\u30B5\u30F3\u30D7\u30EB\u6570", "\u53D6\u5F97\u65E5\u6642", "\u60C5\u5831\u53D6\u5F97\u5143", "\u5099\u8003"], [
    ["\uFF08\u4F8B\uFF09\u5546\u54C1\u540D\u3092\u3053\u3053\u306B", "", "9784000000000", "\u30E1\u30EB\u30AB\u30EA", "\u58F2\u5374\u6E08\u307F\u4FA1\u683C", "900", "5", "2026-11-20 09:00", "\u30A2\u30D7\u30EA\u3067\u624B\u52D5\u78BA\u8A8D", "\u76F4\u8FD15\u4EF6\u306E\u4E2D\u592E\u5024"],
    ["\uFF08\u4F8B\uFF09\u5546\u54C1\u540D\u3092\u3053\u3053\u306B", "", "9784000000000", "Yahoo!\u30D5\u30EA\u30DE", "\u51FA\u54C1\u4FA1\u683C", "1000", "1", "2026-11-20 09:05", "\u30A2\u30D7\u30EA\u3067\u624B\u52D5\u78BA\u8A8D", ""],
    ["\uFF08\u4F8B\uFF09\u5546\u54C1\u540D\u3092\u3053\u3053\u306B", "", "9784000000000", "Amazon\u4E2D\u53E4", "\u51FA\u54C1\u4FA1\u683C", "1200", "1", "2026-11-20 09:10", "Amazon\u5546\u54C1\u30DA\u30FC\u30B8\u3067\u78BA\u8A8D", "\u4E2D\u53E4\u6700\u5B89"]
  ]),
  stores: toCsv(["\u516C\u5F0F\u5E97\u8217ID", "\u5E97\u8217\u540D", "\u90FD\u9053\u5E9C\u770C", "\u6240\u5728\u5730", "\u5E97\u8217\u7A2E\u5225", "\u516C\u5F0FURL", "\u72B6\u614B", "\u5F8C\u7D99\u5E97\u8217ID", "\u78BA\u8A8D\u65E5\u6642", "\u5099\u8003"], [
    ["shop10145", "BOOKOFF \u5BCC\u58EB\u5BAE\u5317\u753A\u5E97", "\u9759\u5CA1\u770C", "\u9759\u5CA1\u770C\u5BCC\u58EB\u5BAE\u5E02\u5317\u753A21-8", "BOOKOFF", "https://www.bookoff.co.jp/shop/shop10145.html", "\u55B6\u696D\u4E2D", "", "2026-11-20", ""]
  ])
};
function exportRowsCsv(rows) {
  const headers = [
    "\u5546\u54C1\u540D",
    "JAN",
    "ISBN",
    "\u30AB\u30C6\u30B4\u30EA",
    "\u5B9A\u4FA1",
    "Amazon\u4E2D\u53E4\xF7\u5B9A\u4FA1\uFF08\u500D\uFF09",
    "\u5B9A\u4FA1\u8D85\u3048",
    "\u30D5\u30EA\u30DE\u58F2\u5374\u6E08\u307F\u4FA1\u683C",
    "\u30D5\u30EA\u30DE\u58F2\u5374\u6E08\u307F\xF7\u5B9A\u4FA1\uFF08\u500D\uFF09",
    "\u4E21\u65B9\u3067\u5B9A\u4FA1\u8D85\u3048",
    "BOOKOFF\u4FA1\u683C",
    "\u5BFE\u8C61\u5E97\u8217",
    "\u90FD\u9053\u5E9C\u770C",
    "\u5E97\u8217\u7A2E\u5225",
    "\u5728\u5EAB\u72B6\u614B",
    "\u5728\u5EAB\u78BA\u8A8D\u65E5\u6642",
    "\u78BA\u8A8D\u304B\u3089\u306E\u65E5\u6570",
    "\u5546\u54C1\u72B6\u614B",
    "\u30E1\u30EB\u30AB\u30EA\u76F8\u5834",
    "\u30E1\u30EB\u30AB\u30EA\u76F8\u5834\u7A2E\u5225",
    "\u30E1\u30EB\u30AB\u30EA\u60F3\u5B9A\u5229\u76CA",
    "\u30E1\u30EB\u30AB\u30EA\u5229\u76CA\u7387(%)",
    "Yahoo!\u30D5\u30EA\u30DE\u76F8\u5834",
    "Yahoo!\u30D5\u30EA\u30DE\u76F8\u5834\u7A2E\u5225",
    "Yahoo!\u30D5\u30EA\u30DE\u60F3\u5B9A\u5229\u76CA",
    "Yahoo!\u30D5\u30EA\u30DE\u5229\u76CA\u7387(%)",
    "Amazon\u4E2D\u53E4\u76F8\u5834",
    "Amazon\u4E2D\u53E4\u76F8\u5834\u7A2E\u5225",
    "Amazon\u4E2D\u53E4\u60F3\u5B9A\u5229\u76CA",
    "Amazon\u4E2D\u53E4\u5229\u76CA\u7387(%)",
    "\u6709\u5229\u306A\u8CA9\u8DEF",
    "\u60F3\u5B9A\u5229\u76CA",
    "\u5229\u76CA\u7387(%)",
    "\u6295\u8CC7\u5229\u76CA\u7387(%)",
    "\u76F8\u5834\u53D6\u5F97\u65E5\u6642",
    "\u30C7\u30FC\u30BF\u7A2E\u5225",
    "\u60C5\u5831\u53D6\u5F97\u5143"
  ];
  const v = (x) => x == null || x === "" ? NA : x;
  const data = rows.map((r) => {
    const m = r.markets.mercari, y = r.markets.yahoo_fleamarket, a = r.markets.amazon_used;
    return [
      r.product.name,
      v(r.product.jan),
      v(r.product.isbn),
      r.product.category,
      v(r.premium.listPrice),
      v(r.premium.ratio),
      r.premium.listPrice == null || r.premium.amazonPrice == null ? NA : r.premium.overList ? "\u306F\u3044" : "\u3044\u3044\u3048",
      v(r.premium.fleaSoldPrice),
      v(r.premium.fleaRatio),
      r.premium.listPrice == null || r.premium.amazonPrice == null || r.premium.fleaSoldPrice == null ? NA : r.premium.bothOverList ? "\u306F\u3044" : "\u3044\u3044\u3048",
      v(r.offer?.price),
      v(r.store?.name),
      v(r.store?.prefecture),
      v(r.store?.brandType),
      r.stock.status,
      r.offer?.checkedAt ? jstDateTime(r.offer.checkedAt) : NA,
      v(r.stock.ageDays),
      v(r.offer?.condition),
      v(m.chosen?.price),
      m.chosen ? PRICE_TYPE_LABEL[m.chosen.priceType] : NA,
      v(m.profit?.profit),
      v(m.profit?.marginPercent),
      v(y.chosen?.price),
      y.chosen ? PRICE_TYPE_LABEL[y.chosen.priceType] : NA,
      v(y.profit?.profit),
      v(y.profit?.marginPercent),
      v(a?.chosen?.price),
      a?.chosen ? PRICE_TYPE_LABEL[a.chosen.priceType] : NA,
      v(a?.profit?.profit),
      v(a?.profit?.marginPercent),
      r.best ? MARKETPLACE_LABEL[r.best] : NA,
      v(r.bestProfit?.profit),
      v(r.bestProfit?.marginPercent),
      v(r.bestProfit?.roiPercent),
      r.latestMarketObservedAt ? jstDateTime(r.latestMarketObservedAt) : NA,
      r.isDemo ? "\u30C7\u30E2" : "\u5B9F\u30C7\u30FC\u30BF",
      r.offer?.source ?? r.product.source
    ];
  });
  return toCsv(headers, data);
}

// src/server/providers/types.ts
var NotImplementedError = class extends Error {
  constructor(providerId, reason) {
    super(reason);
    this.providerId = providerId;
    this.name = "NotImplementedError";
  }
  providerId;
};

// src/server/providers/keepa.ts
var KEEPA_DOMAIN_JP = 5;
var KEEPA_CSV_USED = 2;
var KEEPA_CSV_LISTPRICE = 4;
var BATCH = 100;
var price = (v) => typeof v === "number" && v > 0 ? v : null;
var KeepaAmazonUsedProvider = class _KeepaAmazonUsedProvider {
  info;
  apiKey;
  fetchImpl;
  baseUrl;
  constructor(opts = {}) {
    this.apiKey = opts.apiKey?.trim() || void 0;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.baseUrl = opts.baseUrl ?? "https://api.keepa.com";
    this.info = {
      id: "amazon-used-keepa",
      kind: "market",
      target: "amazon_used",
      label: "Amazon\u4E2D\u53E4 \u81EA\u52D5\u53D6\u5F97\uFF08Keepa API\uFF09",
      method: "api",
      status: "implemented",
      configured: !!this.apiKey,
      bulk: true,
      reason: this.apiKey ? "API\u30AD\u30FC\u8A2D\u5B9A\u6E08\u307F\u3002JAN/ISBN\u306E\u3042\u308B\u5B9F\u30C7\u30FC\u30BF\u5546\u54C1\u306B\u3064\u3044\u3066\u3001\u4E2D\u53E4\u306E\u73FE\u5728\u6700\u5B89\u5024\uFF08\u51FA\u54C1\u4FA1\u683C\uFF09\u3068\u904E\u53BB90\u65E5\u5E73\u5747\uFF08\u63A8\u5B9A\u76F8\u5834\uFF09\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002" : "Keepa API\uFF08\u6709\u6599\uFF09\u306EAPI\u30AD\u30FC\u3092\u74B0\u5883\u5909\u6570 KEEPA_API_KEY \u306B\u8A2D\u5B9A\u3057\u3066\u518D\u8D77\u52D5\u3059\u308B\u3068\u4F7F\u3048\u307E\u3059\u3002"
    };
  }
  /** 商品コード（EAN／ISBN-13）ごとの中古価格。見つからないコードは結果に含めない。 */
  async fetchByCodes(codes) {
    if (!this.apiKey) throw new NotImplementedError(this.info.id, "KEEPA_API_KEY \u304C\u672A\u8A2D\u5B9A\u3067\u3059");
    const out = /* @__PURE__ */ new Map();
    const unique = [...new Set(codes)];
    for (let i = 0; i < unique.length; i += BATCH) {
      const batch = unique.slice(i, i + BATCH);
      const url = `${this.baseUrl}/product?key=${encodeURIComponent(this.apiKey)}&domain=${KEEPA_DOMAIN_JP}&code=${batch.join(",")}&stats=90`;
      const res = await this.fetchImpl(url);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.error) {
        throw new Error(`Keepa API \u30A8\u30E9\u30FC\uFF08HTTP ${res.status}\uFF09\uFF1A${body.error?.message ?? "\u8A73\u7D30\u4E0D\u660E"}`);
      }
      const products = body.products ?? [];
      for (const code of batch) {
        const p = products.find((x) => x.eanList?.includes(code)) ?? (batch.length === 1 && products.length === 1 ? products[0] : void 0);
        if (!p) continue;
        out.set(code, {
          code,
          asin: p.asin,
          title: p.title ?? null,
          currentUsed: price(p.stats?.current?.[KEEPA_CSV_USED]),
          avg90Used: price(p.stats?.avg90?.[KEEPA_CSV_USED]),
          listPrice: price(p.stats?.current?.[KEEPA_CSV_LISTPRICE])
        });
      }
    }
    return out;
  }
  /** 取得結果を相場レコードに変換（現在最安＝出品価格、90日平均＝推定相場） */
  static toPriceInputs(p, observedAt) {
    const base = { marketplace: "amazon_used", observedAt, source: `Keepa API\uFF08ASIN ${p.asin}\uFF09`, sampleCount: null };
    const res = [];
    if (p.currentUsed != null) res.push({ ...base, priceType: "listing", price: p.currentUsed, note: "Amazon\u4E2D\u53E4 \u73FE\u5728\u306E\u6700\u5B89\u5024" });
    if (p.avg90Used != null) res.push({ ...base, priceType: "estimate", price: p.avg90Used, note: "Amazon\u4E2D\u53E4 \u904E\u53BB90\u65E5\u5E73\u5747" });
    return res;
  }
  async fetchPrices(q) {
    const code = q.jan ?? q.isbn;
    if (!code) return [];
    const m = await this.fetchByCodes([code]);
    const p = m.get(code);
    return p ? _KeepaAmazonUsedProvider.toPriceInputs(p, (/* @__PURE__ */ new Date()).toISOString()) : [];
  }
};
function isbn10to13(isbn10) {
  const d = isbn10.replace(/[-\s]/g, "").toUpperCase();
  if (!/^\d{9}[\dX]$/.test(d)) return null;
  const body = `978${d.slice(0, 9)}`;
  const sum = [...body].reduce((acc, c, i) => acc + Number(c) * (i % 2 === 0 ? 1 : 3), 0);
  return body + (10 - sum % 10) % 10;
}

// src/server/providers/registry.ts
function unavailableMarket(marketplace, reason, id = `${marketplace}-auto`, label) {
  return {
    info: { id, kind: "market", target: marketplace, label: label ?? `${MARKETPLACE_LABEL[marketplace]} \u81EA\u52D5\u53D6\u5F97`, method: "api", status: "not_implemented", reason },
    async fetchPrices() {
      throw new NotImplementedError(id, reason);
    }
  };
}
function manualMarket(marketplace, method) {
  const id = `${marketplace}-${method}`;
  return {
    info: { id, kind: "market", target: marketplace, label: `${MARKETPLACE_LABEL[marketplace]} ${method === "csv" ? "CSV\u53D6\u8FBC" : "\u624B\u52D5\u767B\u9332"}`, method, status: "implemented" },
    async fetchPrices() {
      throw new NotImplementedError(id, "\u53D6\u8FBC\u753B\u9762\u30FB\u5546\u54C1\u8A73\u7D30\u304B\u3089\u767B\u9332\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u30D7\u30EB\u578B\u306E\u53D6\u5F97\u306F\u3042\u308A\u307E\u305B\u3093\uFF09");
    }
  };
}
var bookoffInventoryAuto = {
  info: {
    id: "bookoff-inventory-auto",
    kind: "inventory",
    target: "BOOKOFF",
    label: "BOOKOFF \u5E97\u8217\u5728\u5EAB \u81EA\u52D5\u53D6\u5F97",
    method: "api",
    status: "not_implemented",
    reason: "\u5E97\u8217\u5728\u5EAB\u3092\u8FD4\u3059\u516C\u958BAPI\u304C\u78BA\u8A8D\u3067\u304D\u306A\u3044\u305F\u3081\u672A\u5B9F\u88C5\u3002\u5E97\u982D\u78BA\u8A8D\u306E\u7D50\u679C\u3092CSV\u53D6\u8FBC\u30FB\u624B\u52D5\u767B\u9332\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  },
  async fetchInventory() {
    throw new NotImplementedError("bookoff-inventory-auto", this.info.reason);
  }
};
var bookoffInventoryCsv = {
  info: { id: "bookoff-inventory-csv", kind: "inventory", target: "BOOKOFF", label: "BOOKOFF \u5728\u5EAB\u30FB\u4FA1\u683C CSV\u53D6\u8FBC\uFF0F\u624B\u52D5\u767B\u9332", method: "csv", status: "implemented" },
  async fetchInventory() {
    throw new NotImplementedError("bookoff-inventory-csv", "\u53D6\u8FBC\u753B\u9762\u304B\u3089\u767B\u9332\u3057\u3066\u304F\u3060\u3055\u3044");
  }
};
var storeSnapshot = {
  info: {
    id: "bookoff-stores-snapshot",
    kind: "store",
    target: "BOOKOFF",
    label: "\u5E97\u8217\u30DE\u30B9\u30BF\uFF08\u516C\u5F0F\u4E00\u89A7\u30B9\u30CA\u30C3\u30D7\u30B7\u30E7\u30C3\u30C8\uFF0BCSV\u66F4\u65B0\uFF09",
    method: "snapshot",
    status: "implemented",
    reason: "\u516C\u5F0F\u30B5\u30A4\u30C8\u3078\u306E\u81EA\u52D5\u30A2\u30AF\u30BB\u30B9\u306F\u884C\u308F\u306A\u3044\u3002\u6700\u65B0\u5316\u306F\u5E97\u8217CSV\u3067\u884C\u3046\u3002"
  },
  async fetchStores() {
    return [];
  }
};
function createProviders(opts = {}) {
  return [
    manualMarket("mercari", "csv"),
    manualMarket("mercari", "manual"),
    unavailableMarket("mercari", "\u4E00\u822C\u516C\u958B\u306E\u30DE\u30FC\u30B1\u30C3\u30C8\u691C\u7D22API\u304C\u7121\u3044\uFF08\u30E1\u30EB\u30AB\u30EAShops API\u306F\u81EA\u30B7\u30E7\u30C3\u30D7\u7BA1\u7406\u7528\uFF09\u3002\u898F\u7D04\u306B\u53CD\u3059\u308B\u53CE\u96C6\u306F\u884C\u308F\u306A\u3044\u305F\u3081\u672A\u5B9F\u88C5\u3002"),
    manualMarket("yahoo_fleamarket", "csv"),
    manualMarket("yahoo_fleamarket", "manual"),
    unavailableMarket("yahoo_fleamarket", "\u5916\u90E8\u5411\u3051\u306E\u516C\u5F0F\u5546\u54C1\u691C\u7D22API\u304C\u78BA\u8A8D\u3067\u304D\u306A\u3044\u305F\u3081\u672A\u5B9F\u88C5\u3002Yahoo!\u30AA\u30FC\u30AF\u30B7\u30E7\u30F3\uFF0F\u30B7\u30E7\u30C3\u30D4\u30F3\u30B0\u306EAPI\u306F\u4EE3\u66FF\u306B\u4F7F\u308F\u306A\u3044\u3002"),
    manualMarket("amazon_used", "csv"),
    manualMarket("amazon_used", "manual"),
    opts.keepa ?? new KeepaAmazonUsedProvider({ apiKey: process.env.KEEPA_API_KEY }),
    unavailableMarket("amazon_used", "Amazon\u516C\u5F0F\u306ESelling Partner API\uFF08Product Pricing \u306E getItemOffers\u3001ItemCondition=Used\uFF09\u3067\u53D6\u5F97\u53EF\u80FD\u3060\u304C\u3001\u5927\u53E3\u51FA\u54C1\u8005\u30A2\u30AB\u30A6\u30F3\u30C8\u3068\u30A2\u30D7\u30EA\u767B\u9332\u30FB\u8A8D\u8A3C\u60C5\u5831\u304C\u5FC5\u8981\u306A\u305F\u3081\u672A\u5B9F\u88C5\u3002", "amazon-used-spapi", "Amazon\u4E2D\u53E4 \u81EA\u52D5\u53D6\u5F97\uFF08SP-API\uFF09"),
    bookoffInventoryCsv,
    bookoffInventoryAuto,
    storeSnapshot
  ];
}
async function runProvider(p) {
  if ("fetchPrices" in p) return p.fetchPrices({});
  if ("fetchInventory" in p) return p.fetchInventory({});
  return p.fetchStores();
}
async function refreshAmazonUsed(repo, provider) {
  const targets = /* @__PURE__ */ new Map();
  for (const p of repo.listProducts()) {
    if (p.isDemo) continue;
    const code = p.jan ?? (p.isbn ? p.isbn.length === 10 ? isbn10to13(p.isbn) : p.isbn : null);
    if (!code) continue;
    targets.set(code, [...targets.get(code) ?? [], p.id]);
  }
  const result = { providerId: provider.info.id, requested: targets.size, matched: 0, inserted: 0, notFound: 0, listPricesSet: 0, errors: [] };
  if (targets.size === 0) return result;
  const found = await provider.fetchByCodes([...targets.keys()]);
  const observedAt = (/* @__PURE__ */ new Date()).toISOString();
  repo.tx(() => {
    for (const [code, productIds] of targets) {
      const hit = found.get(code);
      if (!hit) {
        result.notFound++;
        continue;
      }
      result.matched++;
      for (const productId of productIds) {
        if (hit.listPrice != null && repo.setListPriceIfEmpty(productId, hit.listPrice, `Keepa\uFF08Amazon\u53C2\u8003\u4FA1\u683C\u30FBASIN ${hit.asin}\uFF09`)) result.listPricesSet++;
        for (const input of KeepaAmazonUsedProvider.toPriceInputs(hit, observedAt)) {
          if (!repo.insertPrice({ ...input, productId }).duplicate) result.inserted++;
        }
      }
    }
  });
  return result;
}

// src/server/api.ts
var MAX_BODY = 10 * 1024 * 1024;
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
};
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new HttpError(413, "\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u5927\u304D\u3059\u304E\u307E\u3059\uFF0810MB\u307E\u3067\uFF09");
    chunks.push(c);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON\u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
  }
}
function send(res, status, body, headers = {}) {
  const isString = typeof body === "string";
  res.writeHead(status, {
    "content-type": isString ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers
  });
  res.end(isString ? body : JSON.stringify(body));
}
var categoryFeeSchema = external_exports.object({
  feeRatePercent: external_exports.number().min(0).max(100).optional(),
  fixedFee: external_exports.number().int().min(0).max(1e5).optional(),
  minFee: external_exports.number().int().min(0).max(1e5).optional()
});
var costSchema = external_exports.object({
  feeRatePercent: external_exports.number().min(0).max(100),
  shipping: external_exports.number().int().min(0).max(1e5),
  categoryFees: external_exports.record(external_exports.enum(CATEGORIES), categoryFeeSchema).optional()
});
var settingsSchema = external_exports.object({
  marketplaces: external_exports.object({ mercari: costSchema, yahoo_fleamarket: costSchema, amazon_used: costSchema }),
  otherCost: external_exports.number().int().min(0).max(1e6),
  priceTypePriority: external_exports.array(external_exports.enum(PRICE_TYPES)).min(1).max(3).refine((a) => new Set(a).size === a.length, "\u91CD\u8907\u4E0D\u53EF"),
  rounding: external_exports.enum(["floor", "round", "ceil"]),
  stockFreshDays: external_exports.number().int().min(0).max(365)
});
var optInt = external_exports.union([external_exports.number().int().min(0), external_exports.null()]).optional();
var productSchema = external_exports.object({
  name: external_exports.string().trim().min(1).max(300),
  jan: external_exports.string().trim().regex(/^(\d{8}|\d{13})$/, "JAN\u306F8\u6841\u307E\u305F\u306F13\u6841").optional().or(external_exports.literal("")),
  isbn: external_exports.string().trim().regex(/^(\d{9}[\dXx]|\d{13})$/, "ISBN\u306F10\u6841\u307E\u305F\u306F13\u6841").optional().or(external_exports.literal("")),
  category: external_exports.enum(CATEGORIES),
  imageUrl: external_exports.string().url().max(1e3).optional().or(external_exports.literal("")),
  shippingOverride: optInt,
  otherCostOverride: optInt,
  listPrice: external_exports.union([external_exports.number().int().positive(), external_exports.null()]).optional()
});
var offerSchema = external_exports.object({
  productId: external_exports.number().int().positive(),
  storeId: external_exports.number().int().positive().nullable(),
  price: external_exports.number().int().min(0).nullable(),
  condition: external_exports.string().max(50).default("\u72B6\u614B\u672A\u78BA\u8A8D"),
  stockStatus: external_exports.enum(STOCK_STATUSES),
  checkedAt: external_exports.string().optional().or(external_exports.literal(""))
});
var priceSchema = external_exports.object({
  productId: external_exports.number().int().positive(),
  marketplace: external_exports.enum(MARKETPLACES),
  priceType: external_exports.enum(PRICE_TYPES),
  price: external_exports.number().int().positive(),
  sampleCount: external_exports.number().int().min(0).nullable().optional(),
  observedAt: external_exports.string().min(1),
  note: external_exports.string().max(300).optional()
});
var importSchema = external_exports.object({ csv: external_exports.string(), filename: external_exports.string().max(200).default("upload.csv") });
function parse(schema, v) {
  const r = schema.safeParse(v);
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join(".") || "\u5165\u529B"}: ${i.message}`).join(" / "));
  return r.data;
}
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json"
};
function checkPassword(header, password) {
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const given = decoded.slice(decoded.indexOf(":") + 1);
  const h = (v) => createHash("sha256").update(v).digest();
  return timingSafeEqual(h(given), h(password));
}
function createHandler(repo, publicDir, providers = createProviders(), opts = {}) {
  const findProvider = (id) => providers.find((p) => p.info.id === id);
  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    const method = req.method ?? "GET";
    if (opts.password && !checkPassword(req.headers.authorization, opts.password)) {
      res.writeHead(401, { "www-authenticate": 'Basic realm="BOOKOFF profit finder", charset="UTF-8"', "content-type": "text/plain; charset=utf-8" });
      return res.end("\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u5FC5\u8981\u3067\u3059");
    }
    try {
      if (!path.startsWith("/api/")) return await serveStatic(res, publicDir, path);
      if (method === "GET" && path === "/api/meta") {
        return send(res, 200, {
          prefectures: PREFECTURES,
          brandTypes: BRAND_TYPES,
          categories: CATEGORIES,
          stockStatuses: STOCK_STATUSES,
          filterStockStatuses: FILTER_STOCK_STATUSES,
          storeStatuses: STORE_STATUSES,
          conditions: CONDITIONS,
          marketplaces: MARKETPLACES,
          marketplaceLabel: MARKETPLACE_LABEL,
          priceTypes: PRICE_TYPES,
          priceTypeLabel: PRICE_TYPE_LABEL,
          counts: { stores: repo.countStores(), demo: repo.countDemo(), real: repo.countReal() },
          storeSeed: { source: STORE_SEED_SOURCE, verifiedAt: STORE_SEED_VERIFIED_AT }
        });
      }
      if (method === "GET" && path === "/api/items") {
        const f = filtersFromParams(url.searchParams);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 2e3);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
        const { rows, total } = queryItems(repo, f);
        return send(res, 200, { total, matched: rows.length, offset, rows: rows.slice(offset, offset + limit), settings: getSettings(repo) });
      }
      if (method === "GET" && path === "/api/export.csv") {
        const { rows } = queryItems(repo, filtersFromParams(url.searchParams));
        const stamp = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 16).replace(/[-:T]/g, "");
        return send(res, 200, exportRowsCsv(rows), {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="bookoff-profit-${stamp}.csv"`
        });
      }
      const tpl = path.match(/^\/api\/templates\/(products|market|stores)\.csv$/);
      if (method === "GET" && tpl) {
        const kind = tpl[1];
        return send(res, 200, TEMPLATES[kind], { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="template-${kind}.csv"` });
      }
      const pm = path.match(/^\/api\/products\/(\d+)$/);
      if (method === "GET" && pm) {
        const id = Number(pm[1]);
        const product = repo.getProduct(id);
        if (!product) throw new HttpError(404, "\u5546\u54C1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        const stores = new Map(repo.listStores().map((s) => [s.id, s]));
        return send(res, 200, {
          product,
          offers: repo.listOffersForProduct(id).map((o) => ({ ...o, store: o.storeId ? stores.get(o.storeId) ?? null : null })),
          prices: repo.listPricesForProduct(id)
        });
      }
      if (method === "POST" && path === "/api/products") {
        const b = parse(productSchema, await readBody(req));
        const p = repo.insertProduct({
          name: b.name,
          jan: b.jan || null,
          isbn: b.isbn ? b.isbn.toUpperCase() : null,
          category: b.category,
          imageUrl: b.imageUrl || null,
          source: "\u624B\u52D5\u767B\u9332",
          shippingOverride: b.shippingOverride ?? null,
          otherCostOverride: b.otherCostOverride ?? null,
          listPrice: b.listPrice ?? null,
          listPriceSource: "\u624B\u52D5\u767B\u9332"
        });
        return send(res, 201, p);
      }
      if (pm && method === "PUT") {
        const b = parse(productSchema, await readBody(req));
        const p = repo.replaceProduct(Number(pm[1]), {
          name: b.name,
          jan: b.jan || null,
          isbn: b.isbn ? b.isbn.toUpperCase() : null,
          category: b.category,
          imageUrl: b.imageUrl || null,
          shippingOverride: b.shippingOverride ?? null,
          otherCostOverride: b.otherCostOverride ?? null,
          listPrice: b.listPrice ?? null
        });
        if (!p) throw new HttpError(404, "\u5546\u54C1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        return send(res, 200, p);
      }
      if (pm && method === "DELETE") {
        if (!repo.deleteProduct(Number(pm[1]))) throw new HttpError(404, "\u5546\u54C1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        return send(res, 200, { deleted: true });
      }
      const del = path.match(/^\/api\/(offers|market-prices)\/(\d+)$/);
      if (del && method === "DELETE") {
        const ok = del[1] === "offers" ? repo.deleteOffer(Number(del[2])) : repo.deletePrice(Number(del[2]));
        if (!ok) throw new HttpError(404, "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        return send(res, 200, { deleted: true });
      }
      if (method === "POST" && path === "/api/offers") {
        const b = parse(offerSchema, await readBody(req));
        if (!repo.getProduct(b.productId)) throw new HttpError(404, "\u5546\u54C1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        if (b.storeId && !repo.getStore(b.storeId)) throw new HttpError(400, "\u5E97\u8217\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        const checkedAt = b.checkedAt ? parseJstDate(b.checkedAt) : null;
        if (b.checkedAt && !checkedAt) throw new HttpError(400, "\u5728\u5EAB\u78BA\u8A8D\u65E5\u6642\u3092\u89E3\u91C8\u3067\u304D\u307E\u305B\u3093");
        const stockStatus = b.stockStatus !== "\u5728\u5EAB\u672A\u78BA\u8A8D" && !checkedAt ? "\u5728\u5EAB\u672A\u78BA\u8A8D" : b.stockStatus;
        const { offer } = repo.upsertOffer({ productId: b.productId, storeId: b.storeId, price: b.price, condition: b.condition, stockStatus, checkedAt, source: "\u624B\u52D5\u767B\u9332" });
        return send(res, 201, offer);
      }
      if (method === "POST" && path === "/api/market-prices") {
        const b = parse(priceSchema, await readBody(req));
        if (!repo.getProduct(b.productId)) throw new HttpError(404, "\u5546\u54C1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        const observedAt = parseJstDate(b.observedAt);
        if (!observedAt) throw new HttpError(400, "\u53D6\u5F97\u65E5\u6642\u3092\u89E3\u91C8\u3067\u304D\u307E\u305B\u3093");
        const { price: price2 } = repo.insertPrice({ ...b, sampleCount: b.sampleCount ?? null, observedAt, source: "\u624B\u52D5\u767B\u9332", note: b.note ?? null });
        return send(res, 201, price2);
      }
      const im = path.match(/^\/api\/import\/(products|market|stores)$/);
      if (method === "POST" && im) {
        const b = parse(importSchema, await readBody(req));
        const fn = im[1] === "products" ? importProducts : im[1] === "market" ? importMarket : importStores;
        return send(res, 200, fn(repo, b.csv, b.filename));
      }
      if (method === "GET" && path === "/api/store-summary") {
        const dk = url.searchParams.get("dataKind");
        return send(res, 200, { summary: summarizeStores(repo, dk === "real" || dk === "demo" ? dk : "all") });
      }
      if (method === "GET" && path === "/api/stores") {
        return send(res, 200, { stores: repo.listStores() });
      }
      const se = path.match(/^\/api\/stores\/(\d+)\/events$/);
      if (method === "GET" && se) return send(res, 200, { events: repo.listStoreEvents(Number(se[1])) });
      if (path === "/api/settings") {
        if (method === "GET") return send(res, 200, getSettings(repo));
        if (method === "PUT") {
          const s = parse(settingsSchema, await readBody(req));
          repo.saveSettings(s);
          return send(res, 200, s);
        }
      }
      if (method === "GET" && path === "/api/providers") return send(res, 200, { providers: providers.map((p) => p.info) });
      const pr = path.match(/^\/api\/providers\/([\w-]+)\/fetch$/);
      if (method === "POST" && pr) {
        const p = findProvider(pr[1]);
        if (!p) throw new HttpError(404, "Provider\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        try {
          if (p instanceof KeepaAmazonUsedProvider) {
            if (!p.info.configured) throw new HttpError(503, `\u8A2D\u5B9A\u304C\u5FC5\u8981\u3067\u3059\uFF1A${p.info.reason}`);
            return send(res, 200, { bulk: await refreshAmazonUsed(repo, p) });
          }
          return send(res, 200, { results: await runProvider(p) });
        } catch (e) {
          if (e instanceof HttpError) throw e;
          if (e instanceof NotImplementedError) throw new HttpError(501, `\u672A\u5B9F\u88C5\uFF1A${e.message}`);
          throw new HttpError(502, e.message);
        }
      }
      if (path === "/api/demo") {
        if (method === "POST") return send(res, 200, { inserted: seedDemo(repo), counts: repo.countDemo() });
        if (method === "DELETE") {
          repo.deleteDemo();
          return send(res, 200, { counts: repo.countDemo() });
        }
      }
      throw new HttpError(404, "API\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      return send(res, 500, { error: "\u30B5\u30FC\u30D0\u5185\u90E8\u30A8\u30E9\u30FC" });
    }
  };
}
async function serveStatic(res, publicDir, path) {
  const rel = normalize2(decodeURIComponent(path)).replace(/^([/\\])+/, "");
  if (rel.includes("..")) return send(res, 400, "bad path");
  const file = join(publicDir, rel || "index.html");
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "x-content-type-options": "nosniff" });
    return res.end(data);
  } catch {
    const data = await readFile(join(publicDir, "index.html"));
    res.writeHead(200, { "content-type": MIME[".html"] });
    return res.end(data);
  }
}

// src/server/main.ts
function startServer(opts = {}) {
  const dbPath = opts.dbPath ?? process.env.DB_PATH ?? resolve("data/app.db");
  const publicDir = opts.publicDir ?? process.env.PUBLIC_DIR ?? resolve("dist/public");
  const repo = new Repository(openDb(dbPath));
  ensureSettings(repo);
  const added = seedStores(repo);
  const demo = opts.demo ?? process.env.SEED_DEMO !== "0";
  const isFresh = repo.countDemo().products === 0 && repo.countReal().products === 0;
  if (demo && isFresh) seedDemo(repo);
  const providers = opts.providers ?? createProviders();
  const password = opts.password ?? process.env.APP_PASSWORD ?? void 0;
  const server = createServer(createHandler(repo, publicDir, providers, { password: password || void 0 }));
  const port = opts.port ?? Number(process.env.PORT ?? 3e3);
  const host = opts.host ?? process.env.HOST ?? "0.0.0.0";
  return new Promise((ok) => {
    server.listen(port, host, () => {
      const addr = server.address();
      const realPort = typeof addr === "object" && addr ? addr.port : port;
      const url = `http://localhost:${realPort}`;
      if (!opts.quiet) {
        console.log(`BOOKOFF\u5229\u76CA\u5546\u54C1\u691C\u7D22\u30C4\u30FC\u30EB \u8D77\u52D5: ${url}`);
        if (added) console.log(`\u5E97\u8217\u30DE\u30B9\u30BF: ${added}\u5E97\u8217\u3092\u767B\u9332`);
        console.log(`Amazon\u4E2D\u53E4\u306E\u81EA\u52D5\u53D6\u5F97\uFF08Keepa\uFF09: ${process.env.KEEPA_API_KEY ? "\u6709\u52B9" : "\u7121\u52B9\uFF08KEEPA_API_KEY \u672A\u8A2D\u5B9A\uFF09"}`);
        console.log(`\u30A2\u30AF\u30BB\u30B9\u7528\u30D1\u30B9\u30EF\u30FC\u30C9: ${password ? "\u8A2D\u5B9A\u3042\u308A" : "\u306A\u3057\uFF08\u540C\u3058Wi-Fi\u306E\u4EBA\u306F\u8AB0\u3067\u3082\u958B\u3051\u307E\u3059\u3002APP_PASSWORD \u3067\u8A2D\u5B9A\u3067\u304D\u307E\u3059\uFF09"}`);
        for (const list of Object.values(networkInterfaces())) {
          for (const a of list ?? []) if (a.family === "IPv4" && !a.internal) console.log(`\u30B9\u30DE\u30DB\u304B\u3089\uFF08\u540C\u4E00Wi-Fi\uFF09: http://${a.address}:${realPort}`);
        }
      }
      ok({ server, repo, url });
    });
  });
}
if (process.argv[1] && /main\.(ts|mjs|js)$/.test(process.argv[1])) {
  startServer().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
export {
  startServer
};
//# sourceMappingURL=main.mjs.map
