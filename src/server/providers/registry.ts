import { NotImplementedError, type AnyProvider, type InventoryProvider, type MarketPriceProvider, type StoreProvider } from './types.ts';
import type { Marketplace } from '../../shared/constants.ts';
import { MARKETPLACE_LABEL } from '../../shared/constants.ts';
import type { BulkFetchResult } from '../../shared/types.ts';
import type { Repository } from '../repository.ts';
import { KeepaAmazonUsedProvider, isbn10to13 } from './keepa.ts';

/** 自動取得（未実装）。公式APIや許諾されたデータ提供が無いため、呼ぶと必ず NotImplementedError。 */
function unavailableMarket(marketplace: Marketplace, reason: string, id = `${marketplace}-auto`, label?: string): MarketPriceProvider {
  return {
    info: { id, kind: 'market', target: marketplace, label: label ?? `${MARKETPLACE_LABEL[marketplace]} 自動取得`, method: 'api', status: 'not_implemented', reason },
    async fetchPrices() { throw new NotImplementedError(id, reason); },
  };
}

/** CSV・手動登録は UI/API から直接DBへ書くため、Providerとしては「実装済みの取込経路」を表すだけ。 */
function manualMarket(marketplace: Marketplace, method: 'csv' | 'manual'): MarketPriceProvider {
  const id = `${marketplace}-${method}`;
  return {
    info: { id, kind: 'market', target: marketplace, label: `${MARKETPLACE_LABEL[marketplace]} ${method === 'csv' ? 'CSV取込' : '手動登録'}`, method, status: 'implemented' },
    async fetchPrices() { throw new NotImplementedError(id, '取込画面・商品詳細から登録してください（プル型の取得はありません）'); },
  };
}

const bookoffInventoryAuto: InventoryProvider = {
  info: {
    id: 'bookoff-inventory-auto', kind: 'inventory', target: 'BOOKOFF', label: 'BOOKOFF 店舗在庫 自動取得', method: 'api', status: 'not_implemented',
    reason: '店舗在庫を返す公開APIが確認できないため未実装。店頭確認の結果をCSV取込・手動登録してください。',
  },
  async fetchInventory() { throw new NotImplementedError('bookoff-inventory-auto', this.info.reason!); },
};

const bookoffInventoryCsv: InventoryProvider = {
  info: { id: 'bookoff-inventory-csv', kind: 'inventory', target: 'BOOKOFF', label: 'BOOKOFF 在庫・価格 CSV取込／手動登録', method: 'csv', status: 'implemented' },
  async fetchInventory() { throw new NotImplementedError('bookoff-inventory-csv', '取込画面から登録してください'); },
};

const storeSnapshot: StoreProvider = {
  info: { id: 'bookoff-stores-snapshot', kind: 'store', target: 'BOOKOFF', label: '店舗マスタ（公式一覧スナップショット＋CSV更新）', method: 'snapshot', status: 'implemented',
    reason: '公式サイトへの自動アクセスは行わない。最新化は店舗CSVで行う。' },
  async fetchStores() { return []; },
};

export function createProviders(opts: { keepa?: KeepaAmazonUsedProvider } = {}): AnyProvider[] {
  return [
    manualMarket('mercari', 'csv'),
    manualMarket('mercari', 'manual'),
    unavailableMarket('mercari', '一般公開のマーケット検索APIが無い（メルカリShops APIは自ショップ管理用）。規約に反する収集は行わないため未実装。'),
    manualMarket('yahoo_fleamarket', 'csv'),
    manualMarket('yahoo_fleamarket', 'manual'),
    unavailableMarket('yahoo_fleamarket', '外部向けの公式商品検索APIが確認できないため未実装。Yahoo!オークション／ショッピングのAPIは代替に使わない。'),
    manualMarket('amazon_used', 'csv'),
    manualMarket('amazon_used', 'manual'),
    opts.keepa ?? new KeepaAmazonUsedProvider({ apiKey: process.env.KEEPA_API_KEY }),
    unavailableMarket('amazon_used', 'Amazon公式のSelling Partner API（Product Pricing の getItemOffers、ItemCondition=Used）で取得可能だが、大口出品者アカウントとアプリ登録・認証情報が必要なため未実装。', 'amazon-used-spapi', 'Amazon中古 自動取得（SP-API）'),
    bookoffInventoryCsv,
    bookoffInventoryAuto,
    storeSnapshot,
  ];
}

export async function runProvider(p: AnyProvider): Promise<unknown[]> {
  if ('fetchPrices' in p) return p.fetchPrices({});
  if ('fetchInventory' in p) return p.fetchInventory({});
  return p.fetchStores();
}

/** JAN/ISBN のある実データ商品について、Amazon中古価格を一括取得して相場に保存する */
export async function refreshAmazonUsed(repo: Repository, provider: KeepaAmazonUsedProvider): Promise<BulkFetchResult> {
  const targets = new Map<string, number[]>();
  for (const p of repo.listProducts()) {
    if (p.isDemo) continue;
    const code = p.jan ?? (p.isbn ? (p.isbn.length === 10 ? isbn10to13(p.isbn) : p.isbn) : null);
    if (!code) continue;
    targets.set(code, [...(targets.get(code) ?? []), p.id]);
  }
  const result: BulkFetchResult = { providerId: provider.info.id, requested: targets.size, matched: 0, inserted: 0, notFound: 0, listPricesSet: 0, errors: [] };
  if (targets.size === 0) return result;
  const found = await provider.fetchByCodes([...targets.keys()]);
  const observedAt = new Date().toISOString();
  repo.tx(() => {
    for (const [code, productIds] of targets) {
      const hit = found.get(code);
      if (!hit) { result.notFound++; continue; }
      result.matched++;
      for (const productId of productIds) {
        if (hit.listPrice != null && repo.setListPriceIfEmpty(productId, hit.listPrice, `Keepa（Amazon参考価格・ASIN ${hit.asin}）`)) result.listPricesSet++;
        for (const input of KeepaAmazonUsedProvider.toPriceInputs(hit, observedAt)) {
          if (!repo.insertPrice({ ...input, productId }).duplicate) result.inserted++;
        }
      }
    }
  });
  return result;
}
