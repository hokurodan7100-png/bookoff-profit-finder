import type { Marketplace } from '../../shared/constants.ts';
import type { ProviderInfo } from '../../shared/types.ts';
import type { PriceInput, OfferInput, StoreInput } from '../repository.ts';

export class NotImplementedError extends Error {
  constructor(readonly providerId: string, reason: string) {
    super(reason);
    this.name = 'NotImplementedError';
  }
}

export interface MarketQuery { productName?: string; jan?: string | null; isbn?: string | null }

/** 販売相場の取得元。実装を差し替えるだけで自動取得に移行できる。 */
export interface MarketPriceProvider {
  readonly info: ProviderInfo & { kind: 'market'; target: Marketplace };
  fetchPrices(q: MarketQuery): Promise<Omit<PriceInput, 'productId'>[]>;
}

/** BOOKOFF店舗在庫の取得元 */
export interface InventoryProvider {
  readonly info: ProviderInfo & { kind: 'inventory' };
  fetchInventory(q: MarketQuery & { storeOfficialId?: string }): Promise<Omit<OfferInput, 'productId'>[]>;
}

/** 店舗マスタの取得元 */
export interface StoreProvider {
  readonly info: ProviderInfo & { kind: 'store' };
  fetchStores(): Promise<StoreInput[]>;
}

export type AnyProvider = MarketPriceProvider | InventoryProvider | StoreProvider;
