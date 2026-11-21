import type { MarketPriceProvider, MarketQuery } from './types.ts';
import { NotImplementedError } from './types.ts';
import type { PriceInput } from '../repository.ts';
import type { ProviderInfo } from '../../shared/types.ts';

/**
 * Keepa API（有料・公式提供）で Amazon.co.jp の中古価格を取得する。
 * - GET https://api.keepa.com/product?key=…&domain=5&code=<EAN/ISBN-13, 最大100件カンマ区切り>&stats=90
 * - domain 5 = co.jp、価格は円の整数。stats.current[2] / stats.avg90[2] が中古（USED）。-1 は出品なし。
 * 参考：https://keepa.com/api-docs/product-object.html / statistics-object.html
 */
export const KEEPA_DOMAIN_JP = 5;
export const KEEPA_CSV_USED = 2;
/** 価格履歴の4番：LISTPRICE（定価・参考価格） */
export const KEEPA_CSV_LISTPRICE = 4;
const BATCH = 100;

export interface KeepaUsedPrice {
  code: string;
  asin: string;
  title: string | null;
  currentUsed: number | null;
  avg90Used: number | null;
  listPrice: number | null;
}

interface KeepaProduct {
  asin: string;
  title?: string;
  eanList?: string[] | null;
  stats?: { current?: number[]; avg90?: number[] } | null;
}

export interface KeepaOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

const price = (v: number | undefined): number | null => (typeof v === 'number' && v > 0 ? v : null);

export class KeepaAmazonUsedProvider implements MarketPriceProvider {
  readonly info: ProviderInfo & { kind: 'market'; target: 'amazon_used' };
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(opts: KeepaOptions = {}) {
    this.apiKey = opts.apiKey?.trim() || undefined;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.baseUrl = opts.baseUrl ?? 'https://api.keepa.com';
    this.info = {
      id: 'amazon-used-keepa',
      kind: 'market',
      target: 'amazon_used',
      label: 'Amazon中古 自動取得（Keepa API）',
      method: 'api',
      status: 'implemented',
      configured: !!this.apiKey,
      bulk: true,
      reason: this.apiKey
        ? 'APIキー設定済み。JAN/ISBNのある実データ商品について、中古の現在最安値（出品価格）と過去90日平均（推定相場）を取得します。'
        : 'Keepa API（有料）のAPIキーを環境変数 KEEPA_API_KEY に設定して再起動すると使えます。',
    };
  }

  /** 商品コード（EAN／ISBN-13）ごとの中古価格。見つからないコードは結果に含めない。 */
  async fetchByCodes(codes: string[]): Promise<Map<string, KeepaUsedPrice>> {
    if (!this.apiKey) throw new NotImplementedError(this.info.id, 'KEEPA_API_KEY が未設定です');
    const out = new Map<string, KeepaUsedPrice>();
    const unique = [...new Set(codes)];
    for (let i = 0; i < unique.length; i += BATCH) {
      const batch = unique.slice(i, i + BATCH);
      const url = `${this.baseUrl}/product?key=${encodeURIComponent(this.apiKey)}&domain=${KEEPA_DOMAIN_JP}&code=${batch.join(',')}&stats=90`;
      const res = await this.fetchImpl(url);
      const body = (await res.json().catch(() => ({}))) as { products?: KeepaProduct[]; error?: { message?: string } };
      if (!res.ok || body.error) {
        throw new Error(`Keepa API エラー（HTTP ${res.status}）：${body.error?.message ?? '詳細不明'}`);
      }
      const products = body.products ?? [];
      for (const code of batch) {
        const p = products.find((x) => x.eanList?.includes(code)) ?? (batch.length === 1 && products.length === 1 ? products[0] : undefined);
        if (!p) continue;
        out.set(code, {
          code,
          asin: p.asin,
          title: p.title ?? null,
          currentUsed: price(p.stats?.current?.[KEEPA_CSV_USED]),
          avg90Used: price(p.stats?.avg90?.[KEEPA_CSV_USED]),
          listPrice: price(p.stats?.current?.[KEEPA_CSV_LISTPRICE]),
        });
      }
    }
    return out;
  }

  /** 取得結果を相場レコードに変換（現在最安＝出品価格、90日平均＝推定相場） */
  static toPriceInputs(p: KeepaUsedPrice, observedAt: string): Omit<PriceInput, 'productId'>[] {
    const base = { marketplace: 'amazon_used' as const, observedAt, source: `Keepa API（ASIN ${p.asin}）`, sampleCount: null };
    const res: Omit<PriceInput, 'productId'>[] = [];
    if (p.currentUsed != null) res.push({ ...base, priceType: 'listing', price: p.currentUsed, note: 'Amazon中古 現在の最安値' });
    if (p.avg90Used != null) res.push({ ...base, priceType: 'estimate', price: p.avg90Used, note: 'Amazon中古 過去90日平均' });
    return res;
  }

  async fetchPrices(q: MarketQuery) {
    const code = q.jan ?? q.isbn;
    if (!code) return [];
    const m = await this.fetchByCodes([code]);
    const p = m.get(code);
    return p ? KeepaAmazonUsedProvider.toPriceInputs(p, new Date().toISOString()) : [];
  }
}

/** ISBN-10 → ISBN-13（Keepaの code は ISBN-13/EAN を受け付ける） */
export function isbn10to13(isbn10: string): string | null {
  const d = isbn10.replace(/[-\s]/g, '').toUpperCase();
  if (!/^\d{9}[\dX]$/.test(d)) return null;
  const body = `978${d.slice(0, 9)}`;
  const sum = [...body].reduce((acc, c, i) => acc + Number(c) * (i % 2 === 0 ? 1 : 3), 0);
  return body + ((10 - (sum % 10)) % 10);
}
