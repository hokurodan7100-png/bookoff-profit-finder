import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { nowIso } from './db.ts';
import type { MarketPrice, Product, Settings, StockOffer, Store, StoreEvent } from '../shared/types.ts';
import type { Category, Marketplace, PriceType, StockStatus } from '../shared/constants.ts';
import { brandGroupOf, type BrandType, type Prefecture, type StoreStatus } from '../shared/constants.ts';

type Row = Record<string, SQLInputValue>;

const toStore = (r: Row): Store => ({
  id: Number(r.id),
  officialId: (r.official_id as string) ?? null,
  name: r.name as string,
  brandType: r.brand_type as BrandType,
  brandGroup: r.brand_group as Store['brandGroup'],
  prefecture: r.prefecture as Prefecture,
  address: r.address as string,
  officialUrl: (r.official_url as string) ?? null,
  status: r.status as StoreStatus,
  successorStoreId: r.successor_store_id == null ? null : Number(r.successor_store_id),
  verifiedAt: (r.verified_at as string) ?? null,
  source: r.source as string,
  note: (r.note as string) ?? null,
  updatedAt: r.updated_at as string,
});

const toProduct = (r: Row): Product => ({
  id: Number(r.id),
  name: r.name as string,
  jan: (r.jan as string) ?? null,
  isbn: (r.isbn as string) ?? null,
  category: r.category as Category,
  imageUrl: (r.image_url as string) ?? null,
  source: r.source as string,
  isDemo: Number(r.is_demo) === 1,
  shippingOverride: r.shipping_override == null ? null : Number(r.shipping_override),
  otherCostOverride: r.other_cost_override == null ? null : Number(r.other_cost_override),
  listPrice: r.list_price == null ? null : Number(r.list_price),
  listPriceSource: (r.list_price_source as string) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

const toOffer = (r: Row): StockOffer => ({
  id: Number(r.id),
  productId: Number(r.product_id),
  storeId: r.store_id == null ? null : Number(r.store_id),
  price: r.price == null ? null : Number(r.price),
  condition: r.condition as string,
  stockStatus: r.stock_status as StockStatus,
  checkedAt: (r.checked_at as string) ?? null,
  source: r.source as string,
  isDemo: Number(r.is_demo) === 1,
  createdAt: r.created_at as string,
});

const toPrice = (r: Row): MarketPrice => ({
  id: Number(r.id),
  productId: Number(r.product_id),
  marketplace: r.marketplace as Marketplace,
  priceType: r.price_type as PriceType,
  price: Number(r.price),
  sampleCount: r.sample_count == null ? null : Number(r.sample_count),
  observedAt: r.observed_at as string,
  source: r.source as string,
  isDemo: Number(r.is_demo) === 1,
  note: (r.note as string) ?? null,
  createdAt: r.created_at as string,
});

export interface StoreInput {
  officialId?: string | null;
  name: string;
  brandType: BrandType;
  prefecture: Prefecture;
  address: string;
  officialUrl?: string | null;
  status?: StoreStatus;
  successorOfficialId?: string | null;
  verifiedAt?: string | null;
  source: string;
  note?: string | null;
}
export interface ProductInput {
  name: string; jan?: string | null; isbn?: string | null; category: Category;
  imageUrl?: string | null; source: string; isDemo?: boolean;
  shippingOverride?: number | null; otherCostOverride?: number | null;
  listPrice?: number | null; listPriceSource?: string | null;
}
export interface OfferInput {
  productId: number; storeId?: number | null; price?: number | null; condition?: string;
  stockStatus?: StockStatus; checkedAt?: string | null; source: string; isDemo?: boolean;
}
export interface PriceInput {
  productId: number; marketplace: Marketplace; priceType: PriceType; price: number;
  sampleCount?: number | null; observedAt: string; source: string; isDemo?: boolean; note?: string | null;
}

/** データアクセス層。PostgreSQL/Prisma 実装に差し替える場合はこのクラスと同じメソッドを実装する。 */
export class Repository {
  constructor(readonly db: DatabaseSync) {}

  /** この接続で行われた変更（追加・更新・削除）の累計。一覧のキャッシュ無効化に使う */
  changeCount(): number {
    return Number((this.db.prepare('SELECT total_changes() c').get() as Row).c);
  }

  tx<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try { const r = fn(); this.db.exec('COMMIT'); return r; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  // ---------- stores ----------
  listStores(): Store[] {
    return (this.db.prepare('SELECT * FROM stores ORDER BY prefecture, id').all() as Row[]).map(toStore);
  }
  getStore(id: number): Store | null {
    const r = this.db.prepare('SELECT * FROM stores WHERE id = ?').get(id) as Row | undefined;
    return r ? toStore(r) : null;
  }
  findStoreByOfficialId(officialId: string): Store | null {
    const r = this.db.prepare('SELECT * FROM stores WHERE official_id = ?').get(officialId) as Row | undefined;
    return r ? toStore(r) : null;
  }
  findStoreByName(name: string): Store | null {
    const r = this.db.prepare('SELECT * FROM stores WHERE name = ? ORDER BY id LIMIT 1').get(name) as Row | undefined;
    return r ? toStore(r) : null;
  }
  countStores(): number {
    return Number((this.db.prepare('SELECT COUNT(*) c FROM stores').get() as Row).c);
  }

  /** 公式IDまたは店舗名で照合して挿入/更新。差分は store_events に記録。 */
  upsertStore(s: StoreInput): { store: Store; action: 'inserted' | 'updated' | 'unchanged' } {
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
      status: s.status ?? '営業中',
      successor_store_id: successor?.id ?? existing?.successorStoreId ?? null,
      verified_at: s.verifiedAt ?? null,
      source: s.source,
      note: s.note ?? null,
    };
    if (!existing) {
      const r = this.db.prepare(`INSERT INTO stores (official_id,name,brand_type,brand_group,prefecture,address,official_url,status,successor_store_id,verified_at,source,note,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        next.official_id, next.name, next.brand_type, next.brand_group, next.prefecture, next.address, next.official_url,
        next.status, next.successor_store_id, next.verified_at, next.source, next.note, now, now);
      const id = Number(r.lastInsertRowid);
      this.addStoreEvent(id, 'open', null, next, s.source);
      return { store: this.getStore(id)!, action: 'inserted' };
    }
    const before = {
      name: existing.name, address: existing.address, status: existing.status,
      brand_type: existing.brandType, official_url: existing.officialUrl,
    };
    const changed = before.name !== next.name || before.address !== next.address || before.status !== next.status
      || before.brand_type !== next.brand_type || before.official_url !== next.official_url
      || (existing.successorStoreId ?? null) !== next.successor_store_id || (existing.note ?? null) !== next.note;
    this.db.prepare(`UPDATE stores SET official_id=?,name=?,brand_type=?,brand_group=?,prefecture=?,address=?,official_url=?,status=?,
      successor_store_id=?,verified_at=COALESCE(?,verified_at),source=?,note=?,updated_at=? WHERE id=?`).run(
      next.official_id, next.name, next.brand_type, next.brand_group, next.prefecture, next.address, next.official_url, next.status,
      next.successor_store_id, next.verified_at, next.source, next.note, now, existing.id);
    if (changed) {
      const type = next.status === '閉店' && before.status !== '閉店' ? 'close'
        : next.status === '移転' || before.address !== next.address ? 'move'
        : before.name !== next.name || next.status === '改称' ? 'rename' : 'update';
      this.addStoreEvent(existing.id, type, before, { name: next.name, address: next.address, status: next.status }, s.source);
    } else if (s.verifiedAt) {
      this.addStoreEvent(existing.id, 'verify', null, { verified_at: s.verifiedAt }, s.source);
    }
    return { store: this.getStore(existing.id)!, action: changed ? 'updated' : 'unchanged' };
  }

  addStoreEvent(storeId: number, type: StoreEvent['eventType'], before: object | null, after: object | null, source: string) {
    this.db.prepare('INSERT INTO store_events (store_id,event_type,before_json,after_json,occurred_at,source) VALUES (?,?,?,?,?,?)')
      .run(storeId, type, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, nowIso(), source);
  }
  listStoreEvents(storeId: number): StoreEvent[] {
    return (this.db.prepare('SELECT * FROM store_events WHERE store_id = ? ORDER BY id DESC').all(storeId) as Row[]).map((r) => ({
      id: Number(r.id), storeId: Number(r.store_id), eventType: r.event_type as StoreEvent['eventType'],
      before: r.before_json ? JSON.parse(r.before_json as string) : null,
      after: r.after_json ? JSON.parse(r.after_json as string) : null,
      occurredAt: r.occurred_at as string, source: r.source as string,
    }));
  }

  // ---------- products ----------
  listProducts(): Product[] {
    return (this.db.prepare('SELECT * FROM products ORDER BY id').all() as Row[]).map(toProduct);
  }
  getProduct(id: number): Product | null {
    const r = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Row | undefined;
    return r ? toProduct(r) : null;
  }
  findProduct(by: { jan?: string | null; isbn?: string | null; name?: string; isDemo: boolean }): Product | null {
    const demo = by.isDemo ? 1 : 0;
    if (by.jan) {
      const r = this.db.prepare('SELECT * FROM products WHERE jan = ? AND is_demo = ?').get(by.jan, demo) as Row | undefined;
      if (r) return toProduct(r);
    }
    if (by.isbn) {
      const r = this.db.prepare('SELECT * FROM products WHERE isbn = ? AND is_demo = ?').get(by.isbn, demo) as Row | undefined;
      if (r) return toProduct(r);
    }
    if (by.name && !by.jan && !by.isbn) {
      const r = this.db.prepare('SELECT * FROM products WHERE name = ? AND jan IS NULL AND isbn IS NULL AND is_demo = ?').get(by.name, demo) as Row | undefined;
      if (r) return toProduct(r);
    }
    return null;
  }
  insertProduct(p: ProductInput): Product {
    const now = nowIso();
    const r = this.db.prepare(`INSERT INTO products (name,jan,isbn,category,image_url,source,is_demo,shipping_override,other_cost_override,list_price,list_price_source,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.name, p.jan ?? null, p.isbn ?? null, p.category, p.imageUrl ?? null, p.source,
      p.isDemo ? 1 : 0, p.shippingOverride ?? null, p.otherCostOverride ?? null, p.listPrice ?? null,
      p.listPrice != null ? p.listPriceSource ?? p.source : null, now, now);
    return this.getProduct(Number(r.lastInsertRowid))!;
  }
  updateProduct(id: number, p: ProductInput): Product {
    this.db.prepare(`UPDATE products SET name=?,jan=COALESCE(?,jan),isbn=COALESCE(?,isbn),category=?,image_url=COALESCE(?,image_url),source=?,
      shipping_override=COALESCE(?,shipping_override),other_cost_override=COALESCE(?,other_cost_override),
      list_price=COALESCE(?,list_price),list_price_source=CASE WHEN ? IS NULL THEN list_price_source ELSE ? END,updated_at=? WHERE id=?`)
      .run(p.name, p.jan ?? null, p.isbn ?? null, p.category, p.imageUrl ?? null, p.source,
        p.shippingOverride ?? null, p.otherCostOverride ?? null,
        p.listPrice ?? null, p.listPrice ?? null, p.listPriceSource ?? p.source, nowIso(), id);
    return this.getProduct(id)!;
  }
  /** 編集画面からの更新：指定した値で置き換える（空欄は消去） */
  replaceProduct(id: number, p: Omit<ProductInput, 'source' | 'isDemo'>): Product | null {
    const cur = this.getProduct(id);
    if (!cur) return null;
    const lpChanged = (p.listPrice ?? null) !== cur.listPrice;
    this.db.prepare(`UPDATE products SET name=?,jan=?,isbn=?,category=?,image_url=?,shipping_override=?,other_cost_override=?,
      list_price=?,list_price_source=?,updated_at=? WHERE id=?`).run(p.name, p.jan ?? null, p.isbn ?? null, p.category, p.imageUrl ?? null,
      p.shippingOverride ?? null, p.otherCostOverride ?? null, p.listPrice ?? null,
      p.listPrice == null ? null : lpChanged ? '手動編集' : cur.listPriceSource, nowIso(), id);
    return this.getProduct(id);
  }
  deleteProduct(id: number): boolean {
    return this.tx(() => {
      this.db.prepare('DELETE FROM market_prices WHERE product_id = ?').run(id);
      this.db.prepare('DELETE FROM stock_offers WHERE product_id = ?').run(id);
      return Number(this.db.prepare('DELETE FROM products WHERE id = ?').run(id).changes) > 0;
    });
  }
  deleteOffer(id: number): boolean {
    return Number(this.db.prepare('DELETE FROM stock_offers WHERE id = ?').run(id).changes) > 0;
  }
  deletePrice(id: number): boolean {
    return Number(this.db.prepare('DELETE FROM market_prices WHERE id = ?').run(id).changes) > 0;
  }

  /** 定価が未登録のときだけ設定する（手入力やCSVの値を自動取得で上書きしない） */
  setListPriceIfEmpty(id: number, listPrice: number, source: string): boolean {
    const r = this.db.prepare('UPDATE products SET list_price=?, list_price_source=?, updated_at=? WHERE id=? AND list_price IS NULL').run(listPrice, source, nowIso(), id);
    return Number(r.changes) > 0;
  }

  // ---------- offers ----------
  listOffers(): StockOffer[] {
    return (this.db.prepare('SELECT * FROM stock_offers ORDER BY id').all() as Row[]).map(toOffer);
  }
  listOffersForProduct(productId: number): StockOffer[] {
    return (this.db.prepare('SELECT * FROM stock_offers WHERE product_id = ? ORDER BY id').all(productId) as Row[]).map(toOffer);
  }
  insertOffer(o: OfferInput): StockOffer {
    const r = this.db.prepare(`INSERT INTO stock_offers (product_id,store_id,price,condition,stock_status,checked_at,source,is_demo,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(o.productId, o.storeId ?? null, o.price ?? null, o.condition ?? '状態未確認',
      o.stockStatus ?? '在庫未確認', o.checkedAt ?? null, o.source, o.isDemo ? 1 : 0, nowIso());
    return toOffer(this.db.prepare('SELECT * FROM stock_offers WHERE id = ?').get(Number(r.lastInsertRowid)) as Row);
  }
  /** 同一商品×同一店舗は最新の確認で置き換える */
  upsertOffer(o: OfferInput): { offer: StockOffer; action: 'inserted' | 'updated' } {
    const existing = this.db.prepare('SELECT id FROM stock_offers WHERE product_id = ? AND store_id IS ? AND is_demo = ?')
      .get(o.productId, o.storeId ?? null, o.isDemo ? 1 : 0) as Row | undefined;
    if (!existing) return { offer: this.insertOffer(o), action: 'inserted' };
    this.db.prepare('UPDATE stock_offers SET price=?,condition=?,stock_status=?,checked_at=?,source=? WHERE id=?')
      .run(o.price ?? null, o.condition ?? '状態未確認', o.stockStatus ?? '在庫未確認', o.checkedAt ?? null, o.source, Number(existing.id));
    return { offer: toOffer(this.db.prepare('SELECT * FROM stock_offers WHERE id = ?').get(Number(existing.id)) as Row), action: 'updated' };
  }

  // ---------- market prices ----------
  listPrices(): MarketPrice[] {
    return (this.db.prepare('SELECT * FROM market_prices ORDER BY id').all() as Row[]).map(toPrice);
  }
  listPricesForProduct(productId: number): MarketPrice[] {
    return (this.db.prepare('SELECT * FROM market_prices WHERE product_id = ? ORDER BY observed_at DESC, id DESC').all(productId) as Row[]).map(toPrice);
  }
  getPrice(id: number): MarketPrice | null {
    const r = this.db.prepare('SELECT * FROM market_prices WHERE id = ?').get(id) as Row | undefined;
    return r ? toPrice(r) : null;
  }
  insertPrice(p: PriceInput): { price: MarketPrice; duplicate: boolean } {
    const dup = this.db.prepare(`SELECT * FROM market_prices WHERE product_id=? AND marketplace=? AND price_type=? AND price=? AND observed_at=? AND is_demo=?`)
      .get(p.productId, p.marketplace, p.priceType, p.price, p.observedAt, p.isDemo ? 1 : 0) as Row | undefined;
    if (dup) return { price: toPrice(dup), duplicate: true };
    const r = this.db.prepare(`INSERT INTO market_prices (product_id,marketplace,price_type,price,sample_count,observed_at,source,is_demo,note,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(p.productId, p.marketplace, p.priceType, p.price, p.sampleCount ?? null, p.observedAt,
      p.source, p.isDemo ? 1 : 0, p.note ?? null, nowIso());
    return { price: toPrice(this.db.prepare('SELECT * FROM market_prices WHERE id = ?').get(Number(r.lastInsertRowid)) as Row), duplicate: false };
  }

  /** 自動算出した推定相場（source が指定値のもの）を置き換える。price が null なら削除のみ */
  replaceAutoEstimate(args: { productId: number; marketplace: Marketplace; isDemo: boolean; source: string; price: number | null;
    sampleCount?: number; observedAt?: string; note?: string }): 'saved' | 'removed' | 'none' {
    const del = this.db.prepare(`DELETE FROM market_prices WHERE product_id=? AND marketplace=? AND price_type='estimate' AND source=? AND is_demo=?`)
      .run(args.productId, args.marketplace, args.source, args.isDemo ? 1 : 0);
    if (args.price == null) return Number(del.changes) > 0 ? 'removed' : 'none';
    this.db.prepare(`INSERT INTO market_prices (product_id,marketplace,price_type,price,sample_count,observed_at,source,is_demo,note,created_at)
      VALUES (?,?,'estimate',?,?,?,?,?,?,?)`).run(args.productId, args.marketplace, args.price, args.sampleCount ?? null,
      args.observedAt ?? nowIso(), args.source, args.isDemo ? 1 : 0, args.note ?? null, nowIso());
    return 'saved';
  }

  /**
   * 重複商品の統合：mergeIds の在庫・相場を keepId に移し、keepId の空欄（JAN・ISBN・画像・定価・送料等）を補ってから削除する。
   * 同じ店舗の在庫が両方にある場合は、確認日時が新しい方を残す。実データとデモは統合しない。
   */
  mergeProducts(keepId: number, mergeIds: number[]): Product {
    return this.tx(() => {
      const keep = this.getProduct(keepId);
      if (!keep) throw new Error('統合先の商品が見つかりません');
      for (const id of mergeIds) {
        if (id === keepId) continue;
        const other = this.getProduct(id);
        if (!other) throw new Error(`商品ID ${id} が見つかりません`);
        if (other.isDemo !== keep.isDemo) throw new Error('実データとデモデータは統合できません');
        for (const o of this.listOffersForProduct(id)) {
          const dup = this.db.prepare('SELECT * FROM stock_offers WHERE product_id = ? AND store_id IS ? AND is_demo = ?')
            .get(keepId, o.storeId, o.isDemo ? 1 : 0) as Row | undefined;
          if (!dup) { this.db.prepare('UPDATE stock_offers SET product_id = ? WHERE id = ?').run(keepId, o.id); continue; }
          const kept = toOffer(dup);
          if ((o.checkedAt ?? '') > (kept.checkedAt ?? '')) {
            this.db.prepare('DELETE FROM stock_offers WHERE id = ?').run(kept.id);
            this.db.prepare('UPDATE stock_offers SET product_id = ? WHERE id = ?').run(keepId, o.id);
          } else this.db.prepare('DELETE FROM stock_offers WHERE id = ?').run(o.id);
        }
        for (const p of this.listPricesForProduct(id)) {
          const dup = this.db.prepare(`SELECT id FROM market_prices WHERE product_id=? AND marketplace=? AND price_type=? AND price=? AND observed_at=? AND is_demo=?`)
            .get(keepId, p.marketplace, p.priceType, p.price, p.observedAt, p.isDemo ? 1 : 0) as Row | undefined;
          if (dup) this.db.prepare('DELETE FROM market_prices WHERE id = ?').run(p.id);
          else this.db.prepare('UPDATE market_prices SET product_id = ? WHERE id = ?').run(keepId, p.id);
        }
        const cur = this.getProduct(keepId)!;
        this.db.prepare(`UPDATE products SET jan=?,isbn=?,image_url=?,shipping_override=?,other_cost_override=?,list_price=?,list_price_source=?,updated_at=? WHERE id=?`)
          .run(cur.jan ?? other.jan, cur.isbn ?? other.isbn, cur.imageUrl ?? other.imageUrl,
            cur.shippingOverride ?? other.shippingOverride, cur.otherCostOverride ?? other.otherCostOverride,
            cur.listPrice ?? other.listPrice, cur.listPrice != null ? cur.listPriceSource : other.listPriceSource, nowIso(), keepId);
        this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
      }
      return this.getProduct(keepId)!;
    });
  }

  countByProduct(table: 'stock_offers' | 'market_prices'): Map<number, number> {
    const rows = this.db.prepare(`SELECT product_id, COUNT(*) c FROM ${table} GROUP BY product_id`).all() as Row[];
    return new Map(rows.map((r) => [Number(r.product_id), Number(r.c)]));
  }

  // ---------- demo ----------
  countDemo(): { products: number; offers: number; prices: number } {
    const c = (t: string) => Number((this.db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE is_demo = 1`).get() as Row).c);
    return { products: c('products'), offers: c('stock_offers'), prices: c('market_prices') };
  }
  countReal(): { products: number; offers: number; prices: number } {
    const c = (t: string) => Number((this.db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE is_demo = 0`).get() as Row).c);
    return { products: c('products'), offers: c('stock_offers'), prices: c('market_prices') };
  }
  deleteDemo() {
    this.tx(() => {
      this.db.exec('DELETE FROM market_prices WHERE is_demo = 1');
      this.db.exec('DELETE FROM stock_offers WHERE is_demo = 1');
      this.db.exec('DELETE FROM products WHERE is_demo = 1');
    });
  }

  // ---------- settings ----------
  getSettings(): Settings | null {
    const r = this.db.prepare("SELECT value_json FROM settings WHERE key = 'app'").get() as Row | undefined;
    return r ? (JSON.parse(r.value_json as string) as Settings) : null;
  }
  saveSettings(s: Settings) {
    this.db.prepare(`INSERT INTO settings (key,value_json,updated_at) VALUES ('app',?,?)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`).run(JSON.stringify(s), nowIso());
  }
}
