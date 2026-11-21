import { z } from 'zod';
import type { Repository } from './repository.ts';
import type { ImportResult, ItemRow, StoreDiff } from '../shared/types.ts';
import { parseCsvRecords, toCsv, type CsvRecord } from '../shared/csv.ts';
import {
  CATEGORIES, FORBIDDEN_MARKETPLACE_WORDS, MARKETPLACE_LABEL, MARKETPLACES, NA, PREFECTURES, PRICE_TYPE_LABEL,
  STOCK_STATUSES, STORE_STATUSES, BRAND_TYPES, detectBrandType, BRAND_NOTES,
  type BrandType, type Category, type Marketplace, type PriceType, type Prefecture, type StockStatus, type StoreStatus,
} from '../shared/constants.ts';
import { jstDateTime } from '../shared/format.ts';

/** ヘッダの別名（日本語・英語）→ 正規名 */
const ALIASES: Record<string, string[]> = {
  name: ['商品名', 'name', 'title'],
  jan: ['JAN', 'JANコード', 'jan'],
  isbn: ['ISBN', 'ISBNコード', 'isbn'],
  category: ['カテゴリ', 'category'],
  imageUrl: ['画像URL', 'image_url', 'imageUrl'],
  storeId: ['店舗ID', '公式店舗ID', 'store_id', 'official_id'],
  storeName: ['店舗名', '在庫店舗', 'store', 'store_name'],
  price: ['BOOKOFF価格', '仕入れ価格', '価格', 'price'],
  listPrice: ['定価', '定価（税込）', '定価(税込)', 'list_price'],
  stockStatus: ['在庫状態', 'stock_status'],
  condition: ['商品状態', 'condition'],
  checkedAt: ['在庫確認日時', 'checked_at'],
  source: ['情報取得元', 'source'],
  marketplace: ['販路', 'marketplace'],
  priceType: ['価格種別', 'price_type'],
  sampleCount: ['サンプル数', 'sample_count'],
  observedAt: ['取得日時', '観測日時', 'observed_at'],
  note: ['備考', 'note'],
  prefecture: ['都道府県', 'prefecture'],
  address: ['所在地', '住所', 'address'],
  brandType: ['店舗種別', '業態', 'brand_type'],
  officialUrl: ['公式URL', 'official_url', 'url'],
  status: ['状態', '店舗状態', 'status'],
  successorId: ['後継店舗ID', 'successor_id'],
  verifiedAt: ['確認日時', 'verified_at'],
};

function canon(rec: CsvRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, names] of Object.entries(ALIASES)) {
    for (const n of names) {
      const v = rec.values[n];
      if (v !== undefined && v !== '') { out[key] = v; break; }
    }
  }
  return out;
}

const digitsOnly = (s: string) => s.normalize('NFKC').replace(/[-\s]/g, '');

const janSchema = z.string().transform(digitsOnly).refine((v) => /^\d{8}$|^\d{13}$/.test(v), 'JANは8桁または13桁の数字');
const isbnSchema = z.string().transform(digitsOnly).refine((v) => /^\d{9}[\dX]$|^\d{13}$/i.test(v), 'ISBNは10桁または13桁');
const yenSchema = z.string().transform((v) => v.normalize('NFKC').replace(/[¥,円\s]/g, ''))
  .refine((v) => /^\d+$/.test(v), '価格は0以上の整数（円）').transform(Number);

/** 日時：タイムゾーン指定がなければ日本時間として解釈 */
export function parseJstDate(v: string): string | null {
  const s = v.normalize('NFKC').trim().replace(/\//g, '-');
  if (!s) return null;
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  const base = /^\d{4}-\d{1,2}-\d{1,2}$/.test(s) ? `${s}T00:00:00` : s.replace(' ', 'T');
  const normalized = base
    .replace(/^(\d{4})-(\d{1,2})-(\d{1,2})/, (_, y, m, d) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    .replace(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/, (_, h, mi, se) => `T${h.padStart(2, '0')}:${mi}:${se ?? '00'}`);
  const t = Date.parse(hasTz ? normalized : `${normalized}+09:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function parseMarketplace(v: string): Marketplace | 'forbidden' | null {
  const s = v.normalize('NFKC').trim().toLowerCase();
  if (FORBIDDEN_MARKETPLACE_WORDS.some((w) => s.includes(w.toLowerCase()))) return 'forbidden';
  if (['メルカリ', 'mercari'].includes(s)) return 'mercari';
  if (['yahoo!フリマ', 'yahooフリマ', 'yahoo_fleamarket', 'paypayフリマ', 'ヤフーフリマ'].includes(s)) return 'yahoo_fleamarket';
  if (['amazon中古', 'amazon', 'amazon_used', 'アマゾン中古', 'アマゾン', 'amazon(中古)'].includes(s)) return 'amazon_used';
  return null;
}

export function parsePriceType(v: string): PriceType | null {
  const s = v.normalize('NFKC').trim().toLowerCase();
  if (['出品価格', '出品', 'listing'].includes(s)) return 'listing';
  if (['売却済み価格', '売却済み', '売切', '売り切れ', 'sold'].includes(s)) return 'sold';
  if (['推定相場', '相場', 'estimate'].includes(s)) return 'estimate';
  return null;
}

function emptyResult(kind: ImportResult['kind'], total: number): ImportResult {
  return { kind, total, inserted: 0, updated: 0, skipped: 0, errors: [] };
}

function resolveProduct(repo: Repository, c: Record<string, string>, source: string, line: number, res: ImportResult) {
  const jan = c.jan ? janSchema.safeParse(c.jan) : null;
  const isbn = c.isbn ? isbnSchema.safeParse(c.isbn) : null;
  if (jan && !jan.success) { res.errors.push({ line, message: jan.error.issues[0].message }); return null; }
  if (isbn && !isbn.success) { res.errors.push({ line, message: isbn.error.issues[0].message }); return null; }
  if (!c.name && !jan && !isbn) { res.errors.push({ line, message: '商品名・JAN・ISBNのいずれかが必要です' }); return null; }
  const category = (c.category && (CATEGORIES as readonly string[]).includes(c.category) ? c.category : 'その他') as Category;
  if (c.category && category !== c.category) {
    res.errors.push({ line, message: `カテゴリ「${c.category}」は無効です（${CATEGORIES.join('／')}）` });
    return null;
  }
  const janV = jan?.success ? jan.data : null;
  const isbnV = isbn?.success ? isbn.data : null;
  let listPrice: number | null = null;
  if (c.listPrice) {
    const lp = yenSchema.safeParse(c.listPrice);
    if (!lp.success || lp.data <= 0) { res.errors.push({ line, message: '定価は1円以上の整数（円）' }); return null; }
    listPrice = lp.data;
  }
  const found = repo.findProduct({ jan: janV, isbn: isbnV, name: c.name, isDemo: false });
  if (found) {
    if (c.name || c.category || c.imageUrl || listPrice != null) {
      repo.updateProduct(found.id, { name: c.name || found.name, jan: janV, isbn: isbnV, category: c.category ? category : found.category,
        imageUrl: c.imageUrl || null, source, listPrice, listPriceSource: listPrice != null ? source : null });
    }
    return { product: found, created: false };
  }
  if (!c.name) { res.errors.push({ line, message: '新規商品には商品名が必要です' }); return null; }
  return { product: repo.insertProduct({ name: c.name, jan: janV, isbn: isbnV, category, imageUrl: c.imageUrl || null, source, listPrice, listPriceSource: source }), created: true };
}

/** BOOKOFF 商品・在庫・価格CSV */
export function importProducts(repo: Repository, text: string, filename: string): ImportResult {
  const { records } = parseCsvRecords(text);
  const res = emptyResult('products', records.length);
  const source = `CSV取込（${filename}）`;
  repo.tx(() => {
    for (const rec of records) {
      const c = canon(rec);
      const startErrors = res.errors.length;
      let storeId: number | null = null;
      if (c.storeId || c.storeName) {
        const st = c.storeId ? repo.findStoreByOfficialId(c.storeId.startsWith('shop') ? c.storeId : `shop${c.storeId}`) : repo.findStoreByName(c.storeName!);
        if (!st) { res.errors.push({ line: rec.line, message: `店舗「${c.storeId ?? c.storeName}」が店舗マスタ（3県）にありません` }); res.skipped++; continue; }
        storeId = st.id;
      }
      let price: number | null = null;
      if (c.price) {
        const p = yenSchema.safeParse(c.price);
        if (!p.success) { res.errors.push({ line: rec.line, message: p.error.issues[0].message }); res.skipped++; continue; }
        price = p.data;
      }
      let stockStatus: StockStatus = '在庫未確認';
      if (c.stockStatus) {
        const map: Record<string, StockStatus> = { 在庫あり: '在庫あり（確認済）', 在庫なし: '在庫なし（確認済）', 未確認: '在庫未確認' };
        const s = (STOCK_STATUSES as readonly string[]).includes(c.stockStatus) ? (c.stockStatus as StockStatus) : map[c.stockStatus];
        if (!s) { res.errors.push({ line: rec.line, message: `在庫状態「${c.stockStatus}」は無効です（${STOCK_STATUSES.join('／')}）` }); res.skipped++; continue; }
        stockStatus = s;
      }
      let checkedAt: string | null = null;
      if (c.checkedAt) {
        checkedAt = parseJstDate(c.checkedAt);
        if (!checkedAt) { res.errors.push({ line: rec.line, message: `在庫確認日時「${c.checkedAt}」を解釈できません` }); res.skipped++; continue; }
      }
      // 確認日時がない「在庫あり」は確認済とみなさない
      if (stockStatus !== '在庫未確認' && !checkedAt) stockStatus = '在庫未確認';
      const prod = resolveProduct(repo, c, c.source ? `${c.source}（${filename}）` : source, rec.line, res);
      if (!prod) { if (res.errors.length > startErrors) res.skipped++; continue; }
      if (storeId != null || price != null) {
        const { action } = repo.upsertOffer({ productId: prod.product.id, storeId, price, condition: c.condition || '状態未確認',
          stockStatus, checkedAt, source: c.source ? `${c.source}（${filename}）` : source });
        if (prod.created || action === 'inserted') res.inserted++; else res.updated++;
      } else if (prod.created) res.inserted++; else res.updated++;
    }
  });
  return res;
}

/** 販売相場CSV（メルカリ・Yahoo!フリマのみ） */
export function importMarket(repo: Repository, text: string, filename: string): ImportResult {
  const { records } = parseCsvRecords(text);
  const res = emptyResult('market', records.length);
  repo.tx(() => {
    for (const rec of records) {
      const c = canon(rec);
      const fail = (message: string) => { res.errors.push({ line: rec.line, message }); res.skipped++; };
      const mp = c.marketplace ? parseMarketplace(c.marketplace) : null;
      if (mp === 'forbidden') { fail(`販路「${c.marketplace}」は使用できません（Yahoo!オークション・Yahoo!ショッピングは相場の代替に使わない）`); continue; }
      if (!mp) { fail(`販路は ${MARKETPLACES.map((m) => MARKETPLACE_LABEL[m]).join('／')} のいずれかを指定してください`); continue; }
      const pt = c.priceType ? parsePriceType(c.priceType) : null;
      if (!pt) { fail(`価格種別は ${Object.values(PRICE_TYPE_LABEL).join('／')} のいずれかを指定してください`); continue; }
      const price = yenSchema.safeParse(c.price ?? '');
      if (!price.success || price.data <= 0) { fail('価格は1円以上の整数で指定してください'); continue; }
      const observedAt = c.observedAt ? parseJstDate(c.observedAt) : null;
      if (!observedAt) { fail('取得日時が必要です（例：2026-11-20 10:30）'); continue; }
      let sampleCount: number | null = null;
      if (c.sampleCount) {
        const n = Number(c.sampleCount);
        if (!Number.isInteger(n) || n < 0) { fail('サンプル数は0以上の整数'); continue; }
        sampleCount = n;
      }
      const before = res.errors.length;
      const prod = resolveProduct(repo, c, `CSV取込（${filename}）`, rec.line, res);
      if (!prod) { if (res.errors.length > before) res.skipped++; continue; }
      const { duplicate } = repo.insertPrice({ productId: prod.product.id, marketplace: mp, priceType: pt, price: price.data,
        sampleCount, observedAt, source: c.source ? `${c.source}（${filename}）` : `CSV取込（${filename}）`, note: c.note || null });
      if (duplicate) res.skipped++; else res.inserted++;
    }
  });
  return res;
}

/** 店舗マスタCSV（3県以外は拒否） */
class Rollback extends Error {}

/**
 * 店舗マスタCSVを保存せずに照合し、追加・変更される店舗と、CSVに無い営業中の店舗（閉店・改称の候補）を返す。
 * 公式の店舗一覧と定期的に見比べる運用（docs/data-sources.md）で使う。
 */
export function diffStores(repo: Repository, text: string, filename: string): StoreDiff {
  const changes: StoreDiff['changes'] = [];
  const seen = new Set<number>();
  let result!: ImportResult;
  try {
    repo.tx(() => {
      result = importStoresInner(repo, text, filename, (line, action, storeId, officialId, name) => {
        seen.add(storeId);
        if (action === 'unchanged') return;
        const ev = repo.listStoreEvents(storeId)[0];
        changes.push({ line, officialId, name, action, before: action === 'updated' ? ev?.before ?? null : null, after: ev?.after ?? null });
      });
      throw new Rollback();
    });
  } catch (e) { if (!(e instanceof Rollback)) throw e; }
  const missing = repo.listStores().filter((s) => s.status === '営業中' && !seen.has(s.id))
    .map((s) => ({ id: s.id, officialId: s.officialId, name: s.name, prefecture: s.prefecture }));
  return { result, changes, missing };
}

export function importStores(repo: Repository, text: string, filename: string): ImportResult {
  let res!: ImportResult;
  repo.tx(() => { res = importStoresInner(repo, text, filename); });
  return res;
}

function importStoresInner(repo: Repository, text: string, filename: string,
  onRow?: (line: number, action: 'inserted' | 'updated' | 'unchanged', storeId: number, officialId: string | null, name: string) => void): ImportResult {
  const { records } = parseCsvRecords(text);
  const res = emptyResult('stores', records.length);
  {
    for (const rec of records) {
      const c = canon(rec);
      c.name = c.storeName ?? c.name;
      const fail = (message: string) => { res.errors.push({ line: rec.line, message }); res.skipped++; };
      if (!c.name) { fail('店舗名が必要です'); continue; }
      if (!c.prefecture || !(PREFECTURES as readonly string[]).includes(c.prefecture)) { fail(`都道府県は ${PREFECTURES.join('／')} のみ対象です`); continue; }
      if (!c.address) { fail('所在地が必要です'); continue; }
      if (!c.address.startsWith(c.prefecture)) { fail('所在地が都道府県と一致しません'); continue; }
      const brandType = (c.brandType ?? detectBrandType(c.name)) as BrandType;
      if (!(BRAND_TYPES as readonly string[]).includes(brandType)) { fail(`店舗種別「${c.brandType}」は無効です`); continue; }
      const status = (c.status ?? '営業中') as StoreStatus;
      if (!(STORE_STATUSES as readonly string[]).includes(status)) { fail(`状態は ${STORE_STATUSES.join('／')} のいずれか`); continue; }
      if (c.officialUrl && !/^https:\/\/www\.bookoff\.co\.jp\//.test(c.officialUrl)) { fail('公式URLは https://www.bookoff.co.jp/ で始まる必要があります'); continue; }
      const verifiedAt = c.verifiedAt ? parseJstDate(c.verifiedAt) : null;
      if (c.verifiedAt && !verifiedAt) { fail('確認日時を解釈できません'); continue; }
      const officialId = c.storeId ? (c.storeId.startsWith('shop') ? c.storeId : `shop${c.storeId}`) : null;
      const successorOfficialId = c.successorId ? (c.successorId.startsWith('shop') ? c.successorId : `shop${c.successorId}`) : null;
      const { action, store } = repo.upsertStore({ officialId, name: c.name, brandType, prefecture: c.prefecture as Prefecture, address: c.address,
        officialUrl: c.officialUrl ?? (officialId ? `https://www.bookoff.co.jp/shop/${officialId}.html` : null), status, successorOfficialId,
        verifiedAt, source: `CSV取込（${filename}）`, note: c.note ?? BRAND_NOTES[brandType] ?? null });
      if (action === 'inserted') res.inserted++; else if (action === 'updated') res.updated++; else res.skipped++;
      onRow?.(rec.line, action, store.id, officialId, c.name);
    }
  }
  return res;
}

export const TEMPLATES: Record<'products' | 'market' | 'stores', string> = {
  products: toCsv(['商品名', 'JAN', 'ISBN', 'カテゴリ', '定価', '画像URL', '店舗ID', '店舗名', 'BOOKOFF価格', '在庫状態', '商品状態', '在庫確認日時', '情報取得元'], [
    ['（例）商品名をここに', '', '9784000000000', '本', '1980', '', 'shop10145', '', '220', '在庫あり（確認済）', '目立った傷なし', '2026-11-20 10:30', '店頭で目視確認'],
  ]),
  market: toCsv(['商品名', 'JAN', 'ISBN', '販路', '価格種別', '価格', 'サンプル数', '取得日時', '情報取得元', '備考'], [
    ['（例）商品名をここに', '', '9784000000000', 'メルカリ', '売却済み価格', '900', '5', '2026-11-20 09:00', 'アプリで手動確認', '直近5件の中央値'],
    ['（例）商品名をここに', '', '9784000000000', 'Yahoo!フリマ', '出品価格', '1000', '1', '2026-11-20 09:05', 'アプリで手動確認', ''],
    ['（例）商品名をここに', '', '9784000000000', 'Amazon中古', '出品価格', '1200', '1', '2026-11-20 09:10', 'Amazon商品ページで確認', '中古最安'],
  ]),
  stores: toCsv(['公式店舗ID', '店舗名', '都道府県', '所在地', '店舗種別', '公式URL', '状態', '後継店舗ID', '確認日時', '備考'], [
    ['shop10145', 'BOOKOFF 富士宮北町店', '静岡県', '静岡県富士宮市北町21-8', 'BOOKOFF', 'https://www.bookoff.co.jp/shop/shop10145.html', '営業中', '', '2026-11-20', ''],
  ]),
};

export function exportRowsCsv(rows: ItemRow[]): string {
  const headers = ['商品名', 'JAN', 'ISBN', 'カテゴリ', '定価', 'Amazon中古÷定価（倍）', '定価超え', 'フリマ売却済み価格', 'フリマ売却済み÷定価（倍）', '両方で定価超え', 'BOOKOFF価格', '対象店舗', '都道府県', '店舗種別', '在庫状態', '在庫確認日時', '確認からの日数', '商品状態',
    'メルカリ相場', 'メルカリ相場種別', 'メルカリ想定利益', 'メルカリ利益率(%)',
    'Yahoo!フリマ相場', 'Yahoo!フリマ相場種別', 'Yahoo!フリマ想定利益', 'Yahoo!フリマ利益率(%)',
    'Amazon中古相場', 'Amazon中古相場種別', 'Amazon中古想定利益', 'Amazon中古利益率(%)',
    '有利な販路', '想定利益', '利益率(%)', '投資利益率(%)', '相場取得日時', 'データ種別', '情報取得元'];
  const v = (x: number | string | null | undefined) => (x == null || x === '' ? NA : x);
  const data = rows.map((r) => {
    const m = r.markets.mercari, y = r.markets.yahoo_fleamarket, a = r.markets.amazon_used;
    return [
      r.product.name, v(r.product.jan), v(r.product.isbn), r.product.category, v(r.premium.listPrice), v(r.premium.ratio),
      r.premium.listPrice == null || r.premium.amazonPrice == null ? NA : r.premium.overList ? 'はい' : 'いいえ',
      v(r.premium.fleaSoldPrice), v(r.premium.fleaRatio),
      r.premium.listPrice == null || r.premium.amazonPrice == null || r.premium.fleaSoldPrice == null ? NA : r.premium.bothOverList ? 'はい' : 'いいえ',
      v(r.offer?.price),
      v(r.store?.name), v(r.store?.prefecture), v(r.store?.brandType), r.stock.status,
      r.offer?.checkedAt ? jstDateTime(r.offer.checkedAt) : NA, v(r.stock.ageDays), v(r.offer?.condition),
      v(m.chosen?.price), m.chosen ? PRICE_TYPE_LABEL[m.chosen.priceType] : NA, v(m.profit?.profit), v(m.profit?.marginPercent),
      v(y.chosen?.price), y.chosen ? PRICE_TYPE_LABEL[y.chosen.priceType] : NA, v(y.profit?.profit), v(y.profit?.marginPercent),
      v(a?.chosen?.price), a?.chosen ? PRICE_TYPE_LABEL[a.chosen.priceType] : NA, v(a?.profit?.profit), v(a?.profit?.marginPercent),
      r.best ? MARKETPLACE_LABEL[r.best] : NA, v(r.bestProfit?.profit), v(r.bestProfit?.marginPercent), v(r.bestProfit?.roiPercent),
      r.latestMarketObservedAt ? jstDateTime(r.latestMarketObservedAt) : NA,
      r.isDemo ? 'デモ' : '実データ', r.offer?.source ?? r.product.source,
    ];
  });
  return toCsv(headers, data);
}
