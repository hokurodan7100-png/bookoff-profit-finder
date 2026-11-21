import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual, createHash } from 'node:crypto';
import { extname, join, normalize } from 'node:path';
import { z } from 'zod';
import type { Repository } from './repository.ts';
import { queryItems, getSettings, summarizeStores, recomputeEstimates, findDuplicates } from './service.ts';
import { filtersFromParams } from '../shared/filters.ts';
import { diffStores, exportRowsCsv, importMarket, importProducts, importStores, parseJstDate, TEMPLATES } from './importers.ts';
import { seedDemo, STORE_SEED_SOURCE, STORE_SEED_VERIFIED_AT } from './seed.ts';
import { createProviders, refreshAmazonUsed, runProvider } from './providers/registry.ts';
import { KeepaAmazonUsedProvider } from './providers/keepa.ts';
import type { AnyProvider } from './providers/types.ts';
import { NotImplementedError } from './providers/types.ts';
import { FILTER_STOCK_STATUSES } from '../shared/stock.ts';
import {
  BRAND_TYPES, CATEGORIES, CONDITIONS, MARKETPLACES, PREFECTURES, PRICE_TYPES, STOCK_STATUSES, STORE_STATUSES, MARKETPLACE_LABEL, PRICE_TYPE_LABEL,
} from '../shared/constants.ts';

const MAX_BODY = 10 * 1024 * 1024;

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, 'リクエストが大きすぎます（10MBまで）');
    chunks.push(c as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'JSONの形式が不正です'); }
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const isString = typeof body === 'string';
  res.writeHead(status, {
    'content-type': isString ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  res.end(isString ? body : JSON.stringify(body));
}

const categoryFeeSchema = z.object({
  feeRatePercent: z.number().min(0).max(100).optional(),
  fixedFee: z.number().int().min(0).max(100000).optional(),
  minFee: z.number().int().min(0).max(100000).optional(),
});
const costSchema = z.object({
  feeRatePercent: z.number().min(0).max(100),
  shipping: z.number().int().min(0).max(100000),
  categoryFees: z.record(z.enum(CATEGORIES), categoryFeeSchema).optional(),
});
const settingsSchema = z.object({
  marketplaces: z.object({ mercari: costSchema, yahoo_fleamarket: costSchema, amazon_used: costSchema }),
  otherCost: z.number().int().min(0).max(1000000),
  priceTypePriority: z.array(z.enum(PRICE_TYPES)).min(1).max(3).refine((a) => new Set(a).size === a.length, '重複不可'),
  rounding: z.enum(['floor', 'round', 'ceil']),
  stockFreshDays: z.number().int().min(0).max(365),
  estimateDays: z.number().int().min(0).max(3650).default(30),
});

const optInt = z.union([z.number().int().min(0), z.null()]).optional();
const productSchema = z.object({
  name: z.string().trim().min(1).max(300),
  jan: z.string().trim().regex(/^(\d{8}|\d{13})$/, 'JANは8桁または13桁').optional().or(z.literal('')),
  isbn: z.string().trim().regex(/^(\d{9}[\dXx]|\d{13})$/, 'ISBNは10桁または13桁').optional().or(z.literal('')),
  category: z.enum(CATEGORIES),
  imageUrl: z.string().url().max(1000).optional().or(z.literal('')),
  shippingOverride: optInt,
  otherCostOverride: optInt,
  listPrice: z.union([z.number().int().positive(), z.null()]).optional(),
});
const offerSchema = z.object({
  productId: z.number().int().positive(),
  storeId: z.number().int().positive().nullable(),
  price: z.number().int().min(0).nullable(),
  condition: z.string().max(50).default('状態未確認'),
  stockStatus: z.enum(STOCK_STATUSES),
  checkedAt: z.string().optional().or(z.literal('')),
});
const priceSchema = z.object({
  productId: z.number().int().positive(),
  marketplace: z.enum(MARKETPLACES),
  priceType: z.enum(PRICE_TYPES),
  price: z.number().int().positive(),
  sampleCount: z.number().int().min(0).nullable().optional(),
  observedAt: z.string().min(1),
  note: z.string().max(300).optional(),
});
const importSchema = z.object({ csv: z.string(), filename: z.string().max(200).default('upload.csv') });

function parse<S extends z.ZodTypeAny>(schema: S, v: unknown): z.infer<S> {
  const r = schema.safeParse(v);
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join('.') || '入力'}: ${i.message}`).join(' / '));
  return r.data;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

/** APP_PASSWORD を設定したときだけ、全ページにBasic認証をかける（ユーザー名は任意） */
export function checkPassword(header: string | undefined, password: string): boolean {
  if (!header?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const given = decoded.slice(decoded.indexOf(':') + 1);
  const h = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(h(given), h(password));
}

export function createHandler(repo: Repository, publicDir: string, providers: AnyProvider[] = createProviders(), opts: { password?: string } = {}) {
  const findProvider = (id: string) => providers.find((p) => p.info.id === id);
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method ?? 'GET';
    if (opts.password && !checkPassword(req.headers.authorization, opts.password)) {
      res.writeHead(401, { 'www-authenticate': 'Basic realm="BOOKOFF profit finder", charset="UTF-8"', 'content-type': 'text/plain; charset=utf-8' });
      return res.end('パスワードが必要です');
    }
    try {
      if (!path.startsWith('/api/')) return await serveStatic(res, publicDir, path);

      if (method === 'GET' && path === '/api/meta') {
        return send(res, 200, {
          prefectures: PREFECTURES, brandTypes: BRAND_TYPES, categories: CATEGORIES, stockStatuses: STOCK_STATUSES, filterStockStatuses: FILTER_STOCK_STATUSES,
          storeStatuses: STORE_STATUSES, conditions: CONDITIONS, marketplaces: MARKETPLACES, marketplaceLabel: MARKETPLACE_LABEL,
          priceTypes: PRICE_TYPES, priceTypeLabel: PRICE_TYPE_LABEL,
          counts: { stores: repo.countStores(), demo: repo.countDemo(), real: repo.countReal() },
          storeSeed: { source: STORE_SEED_SOURCE, verifiedAt: STORE_SEED_VERIFIED_AT },
        });
      }
      if (method === 'GET' && path === '/api/items') {
        const f = filtersFromParams(url.searchParams);
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 2000);
        const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0);
        const { rows, total } = queryItems(repo, f);
        return send(res, 200, { total, matched: rows.length, offset, rows: rows.slice(offset, offset + limit), settings: getSettings(repo) });
      }
      if (method === 'GET' && path === '/api/export.csv') {
        const { rows } = queryItems(repo, filtersFromParams(url.searchParams));
        const stamp = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 16).replace(/[-:T]/g, '');
        return send(res, 200, exportRowsCsv(rows), {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="bookoff-profit-${stamp}.csv"`,
        });
      }
      const tpl = path.match(/^\/api\/templates\/(products|market|stores)\.csv$/);
      if (method === 'GET' && tpl) {
        const kind = tpl[1] as keyof typeof TEMPLATES;
        return send(res, 200, TEMPLATES[kind], { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="template-${kind}.csv"` });
      }
      const pm = path.match(/^\/api\/products\/(\d+)$/);
      if (method === 'GET' && pm) {
        const id = Number(pm[1]);
        const product = repo.getProduct(id);
        if (!product) throw new HttpError(404, '商品が見つかりません');
        const stores = new Map(repo.listStores().map((s) => [s.id, s]));
        return send(res, 200, {
          product,
          offers: repo.listOffersForProduct(id).map((o) => ({ ...o, store: o.storeId ? stores.get(o.storeId) ?? null : null })),
          prices: repo.listPricesForProduct(id),
        });
      }
      if (method === 'POST' && path === '/api/products') {
        const b = parse(productSchema, await readBody(req));
        const p = repo.insertProduct({ name: b.name, jan: b.jan || null, isbn: b.isbn ? b.isbn.toUpperCase() : null, category: b.category,
          imageUrl: b.imageUrl || null, source: '手動登録', shippingOverride: b.shippingOverride ?? null, otherCostOverride: b.otherCostOverride ?? null,
          listPrice: b.listPrice ?? null, listPriceSource: '手動登録' });
        return send(res, 201, p);
      }
      if (pm && method === 'PUT') {
        const b = parse(productSchema, await readBody(req));
        const p = repo.replaceProduct(Number(pm[1]), { name: b.name, jan: b.jan || null, isbn: b.isbn ? b.isbn.toUpperCase() : null, category: b.category,
          imageUrl: b.imageUrl || null, shippingOverride: b.shippingOverride ?? null, otherCostOverride: b.otherCostOverride ?? null, listPrice: b.listPrice ?? null });
        if (!p) throw new HttpError(404, '商品が見つかりません');
        return send(res, 200, p);
      }
      if (pm && method === 'DELETE') {
        if (!repo.deleteProduct(Number(pm[1]))) throw new HttpError(404, '商品が見つかりません');
        return send(res, 200, { deleted: true });
      }
      const del = path.match(/^\/api\/(offers|market-prices)\/(\d+)$/);
      if (del && method === 'DELETE') {
        let productId: number | null = null;
        if (del[1] === 'market-prices') productId = repo.getPrice(Number(del[2]))?.productId ?? null;
        const ok = del[1] === 'offers' ? repo.deleteOffer(Number(del[2])) : repo.deletePrice(Number(del[2]));
        if (!ok) throw new HttpError(404, '対象が見つかりません');
        if (productId != null) recomputeEstimates(repo, { productIds: [productId] });
        return send(res, 200, { deleted: true });
      }
      if (method === 'POST' && path === '/api/offers') {
        const b = parse(offerSchema, await readBody(req));
        if (!repo.getProduct(b.productId)) throw new HttpError(404, '商品が見つかりません');
        if (b.storeId && !repo.getStore(b.storeId)) throw new HttpError(400, '店舗が見つかりません');
        const checkedAt = b.checkedAt ? parseJstDate(b.checkedAt) : null;
        if (b.checkedAt && !checkedAt) throw new HttpError(400, '在庫確認日時を解釈できません');
        const stockStatus = b.stockStatus !== '在庫未確認' && !checkedAt ? '在庫未確認' : b.stockStatus;
        const { offer } = repo.upsertOffer({ productId: b.productId, storeId: b.storeId, price: b.price, condition: b.condition, stockStatus, checkedAt, source: '手動登録' });
        return send(res, 201, offer);
      }
      if (method === 'POST' && path === '/api/market-prices') {
        const b = parse(priceSchema, await readBody(req));
        if (!repo.getProduct(b.productId)) throw new HttpError(404, '商品が見つかりません');
        const observedAt = parseJstDate(b.observedAt);
        if (!observedAt) throw new HttpError(400, '取得日時を解釈できません');
        const { price } = repo.insertPrice({ ...b, sampleCount: b.sampleCount ?? null, observedAt, source: '手動登録', note: b.note ?? null });
        if (b.priceType === 'sold') recomputeEstimates(repo, { productIds: [b.productId] });
        return send(res, 201, price);
      }
      const im = path.match(/^\/api\/import\/(products|market|stores)$/);
      if (method === 'POST' && im) {
        const b = parse(importSchema, await readBody(req));
        if (im[1] === 'stores' && url.searchParams.get('dryRun') === '1') return send(res, 200, diffStores(repo, b.csv, b.filename));
        const fn = im[1] === 'products' ? importProducts : im[1] === 'market' ? importMarket : importStores;
        const result = fn(repo, b.csv, b.filename);
        const estimates = im[1] === 'market' && result.inserted > 0 ? recomputeEstimates(repo) : undefined;
        return send(res, 200, { ...result, estimates });
      }
      if (method === 'POST' && path === '/api/estimates/recompute') return send(res, 200, recomputeEstimates(repo));
      if (method === 'GET' && path === '/api/duplicates') return send(res, 200, { groups: findDuplicates(repo) });
      if (method === 'POST' && path === '/api/products/merge') {
        const b = parse(z.object({ keepId: z.number().int().positive(), mergeIds: z.array(z.number().int().positive()).min(1).max(100) }), await readBody(req));
        let product;
        try { product = repo.mergeProducts(b.keepId, b.mergeIds); } catch (e) { throw new HttpError(400, (e as Error).message); }
        recomputeEstimates(repo, { productIds: [b.keepId] });
        return send(res, 200, { product });
      }
      if (method === 'GET' && path === '/api/store-summary') {
        const dk = url.searchParams.get('dataKind');
        return send(res, 200, { summary: summarizeStores(repo, dk === 'real' || dk === 'demo' ? dk : 'all') });
      }
      if (method === 'GET' && path === '/api/stores') {
        return send(res, 200, { stores: repo.listStores() });
      }
      const se = path.match(/^\/api\/stores\/(\d+)\/events$/);
      if (method === 'GET' && se) return send(res, 200, { events: repo.listStoreEvents(Number(se[1])) });
      if (path === '/api/settings') {
        if (method === 'GET') return send(res, 200, getSettings(repo));
        if (method === 'PUT') {
          const s = parse(settingsSchema, await readBody(req));
          const prevDays = getSettings(repo).estimateDays;
          repo.saveSettings(s);
          if (prevDays !== s.estimateDays) recomputeEstimates(repo);
          return send(res, 200, s);
        }
      }
      if (method === 'GET' && path === '/api/providers') return send(res, 200, { providers: providers.map((p) => p.info) });
      const pr = path.match(/^\/api\/providers\/([\w-]+)\/fetch$/);
      if (method === 'POST' && pr) {
        const p = findProvider(pr[1]);
        if (!p) throw new HttpError(404, 'Providerが見つかりません');
        try {
          if (p instanceof KeepaAmazonUsedProvider) {
            if (!p.info.configured) throw new HttpError(503, `設定が必要です：${p.info.reason}`);
            return send(res, 200, { bulk: await refreshAmazonUsed(repo, p) });
          }
          return send(res, 200, { results: await runProvider(p) });
        } catch (e) {
          if (e instanceof HttpError) throw e;
          if (e instanceof NotImplementedError) throw new HttpError(501, `未実装：${e.message}`);
          throw new HttpError(502, (e as Error).message);
        }
      }
      if (path === '/api/demo') {
        if (method === 'POST') return send(res, 200, { inserted: seedDemo(repo), counts: repo.countDemo() });
        if (method === 'DELETE') { repo.deleteDemo(); return send(res, 200, { counts: repo.countDemo() }); }
      }
      throw new HttpError(404, 'APIが見つかりません');
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      return send(res, 500, { error: 'サーバ内部エラー' });
    }
  };
}

async function serveStatic(res: ServerResponse, publicDir: string, path: string) {
  const rel = normalize(decodeURIComponent(path)).replace(/^([/\\])+/, '');
  if (rel.includes('..')) return send(res, 400, 'bad path');
  const file = join(publicDir, rel || 'index.html');
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    return res.end(data);
  } catch {
    // SPA: 不明パスは index.html
    const data = await readFile(join(publicDir, 'index.html'));
    res.writeHead(200, { 'content-type': MIME['.html'] });
    return res.end(data);
  }
}
