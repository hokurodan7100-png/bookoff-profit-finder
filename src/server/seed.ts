import storeSeed from '../../data/stores.seed.json' with { type: 'json' };
import type { Repository } from './repository.ts';
import type { Settings } from '../shared/types.ts';
import { detectBrandType, PREFECTURES, BRAND_NOTES, type Category, type Prefecture, type StockStatus } from '../shared/constants.ts';

/**
 * 設定の初期値。初回起動時にDBへ保存され、以後は設定画面の値が使われる。
 * 手数料率は 2026-11 時点の公開情報（docs/data-sources.md）。改定があり得るので設定画面で変更すること。
 */
export const DEFAULT_SETTINGS: Settings = {
  marketplaces: {
    mercari: { feeRatePercent: 10, shipping: 210 },
    yahoo_fleamarket: { feeRatePercent: 5, shipping: 210 },
    // Amazon.co.jp 中古（自己発送想定）。メディアは15%・最低手数料なし＋カテゴリー成約料（本80円、CD・DVD140円）。
    // それ以外は保守的に「その他のカテゴリー」15%・最低30円。実際の料率はカテゴリーで異なるため設定画面で調整する。
    amazon_used: {
      feeRatePercent: 15,
      shipping: 210,
      categoryFees: {
        本: { fixedFee: 80 },
        CD: { fixedFee: 140 },
        'DVD・BD': { fixedFee: 140 },
        ゲーム: {},
        ホビー: { minFee: 30 },
        家電: { minFee: 30 },
        その他: { minFee: 30 },
      },
    },
  },
  otherCost: 0,
  priceTypePriority: ['estimate', 'sold', 'listing'],
  rounding: 'floor',
  stockFreshDays: 3,
};

export const STORE_SEED_SOURCE = storeSeed.source;
export const STORE_SEED_VERIFIED_AT = storeSeed.verifiedAt;

export function seedStores(repo: Repository): number {
  let n = 0;
  repo.tx(() => {
    for (const s of storeSeed.stores) {
      if (!PREFECTURES.includes(s.prefecture as Prefecture)) continue;
      const brandType = detectBrandType(s.name);
      const { action } = repo.upsertStore({
        officialId: s.officialId,
        name: s.name,
        brandType,
        prefecture: s.prefecture as Prefecture,
        address: s.address,
        officialUrl: s.officialUrl,
        status: '営業中',
        verifiedAt: storeSeed.verifiedAt,
        source: `${storeSeed.source}（${s.sourceUrl}）`,
        note: BRAND_NOTES[brandType] ?? null,
      });
      if (action === 'inserted') n++;
    }
  });
  return n;
}

/** 保存済み設定に、後から追加された販路の初期値を補う（既存の値は変更しない） */
export function withDefaults(s: Settings): Settings {
  return { ...DEFAULT_SETTINGS, ...s, marketplaces: { ...DEFAULT_SETTINGS.marketplaces, ...s.marketplaces } };
}

export function ensureSettings(repo: Repository) {
  const cur = repo.getSettings();
  if (!cur) repo.saveSettings(DEFAULT_SETTINGS);
  else if (Object.keys(DEFAULT_SETTINGS.marketplaces).some((k) => !(k in cur.marketplaces))) repo.saveSettings(withDefaults(cur));
}

interface DemoItem {
  name: string; category: Category; jan?: string; isbn?: string; listPrice?: number;
  offers: { store: string; price: number; status: StockStatus; condition: string; daysAgo: number | null }[];
  mercari?: { listing?: number; sold?: number; estimate?: number };
  yahoo?: { listing?: number; sold?: number; estimate?: number };
  amazon?: { listing?: number; estimate?: number };
}

/** 架空のデモデータ。価格・在庫はすべて架空で、実在の店舗在庫を表さない。 */
const DEMO_ITEMS: DemoItem[] = [
  { name: 'サンプル 推理小説 文庫 上下巻セット', category: '本', isbn: '9780000000011', listPrice: 1540,
    offers: [{ store: 'shop10145', price: 220, status: '在庫あり（確認済）', condition: '目立った傷なし', daysAgo: 1 },
      { store: 'shop20290', price: 330, status: '在庫未確認', condition: '状態未確認', daysAgo: null }],
    mercari: { sold: 900, listing: 1100 }, yahoo: { sold: 850 }, amazon: { listing: 1280, estimate: 1150 } },
  { name: 'サンプル 資格試験 対策問題集 2026年版', category: '本', isbn: '9780000000028', listPrice: 3080,
    offers: [{ store: 'shop10259', price: 1100, status: '在庫あり（確認済）', condition: 'やや傷あり', daysAgo: 2 }],
    mercari: { sold: 2400, estimate: 2300 }, yahoo: { listing: 2600 }, amazon: { listing: 3100, estimate: 2900 } },
  { name: 'サンプル 家庭用ゲームソフト アクションRPG', category: 'ゲーム', jan: '4900000000010', listPrice: 7678,
    offers: [{ store: 'shop20467', price: 2980, status: '在庫あり（確認済）', condition: '目立った傷なし', daysAgo: 0 },
      { store: 'shop20545', price: 3280, status: '在庫未確認', condition: '状態未確認', daysAgo: null }],
    mercari: { sold: 4600 }, yahoo: { sold: 4400, listing: 4980 }, amazon: { listing: 4300 } },
  { name: 'サンプル 携帯ゲーム機用ソフト パズル', category: 'ゲーム', jan: '4900000000027',
    offers: [{ store: 'shop10219', price: 1650, status: '在庫あり（確認済）', condition: '目立った傷なし', daysAgo: 3 }],
    mercari: { sold: 1500 }, yahoo: { sold: 1600 } },
  { name: 'サンプル アニメ Blu-ray BOX 全話収録', category: 'DVD・BD', jan: '4900000000034', listPrice: 8800,
    offers: [{ store: 'shop20120', price: 5500, status: '在庫あり（確認済）', condition: '目立った傷なし', daysAgo: 1 }],
    mercari: { sold: 9800, estimate: 9500 }, amazon: { listing: 12800, estimate: 11800 } },
  { name: 'サンプル 洋楽 ベストアルバム 限定盤CD', category: 'CD', jan: '4900000000041', listPrice: 1650,
    offers: [{ store: 'shop10546', price: 550, status: '在庫未確認', condition: '状態未確認', daysAgo: null }],
    yahoo: { listing: 1800 }, amazon: { listing: 2480, estimate: 2200 } },
  { name: 'サンプル 1/144 プラモデル 未組立', category: 'ホビー', jan: '4900000000058',
    offers: [{ store: 'shop20270', price: 1980, status: '在庫あり（確認済）', condition: '新品', daysAgo: 0 }],
    mercari: { sold: 3500 }, yahoo: { sold: 3300 } },
  { name: 'サンプル ワイヤレスイヤホン 充電ケース付', category: '家電', jan: '4900000000065',
    offers: [{ store: 'shop20431', price: 4400, status: '在庫あり（確認済）', condition: 'やや傷あり', daysAgo: 5 }],
    mercari: { sold: 4200 }, yahoo: { listing: 4500 } },
  { name: 'サンプル 写真集 初版 帯付き', category: '本', isbn: '9780000000035', listPrice: 2750,
    offers: [{ store: 'shop20316', price: 770, status: '在庫なし（確認済）', condition: '目立った傷なし', daysAgo: 4 }],
    mercari: { sold: 2800 }, amazon: { listing: 4980, estimate: 4600 } },
  { name: 'サンプル 映画 DVD シリーズ3作セット', category: 'DVD・BD', jan: '4900000000072', listPrice: 4180,
    offers: [{ store: 'shop10050', price: 990, status: '在庫あり（確認済）', condition: '目立った傷なし', daysAgo: 2 }],
    amazon: { listing: 1580, estimate: 1500 } },
];

export function seedDemo(repo: Repository): number {
  const now = Date.now();
  const iso = (daysAgo: number, hour = 12) => new Date(now - daysAgo * 86400000 - (12 - hour) * 3600000).toISOString();
  let n = 0;
  repo.tx(() => {
    for (const d of DEMO_ITEMS) {
      const existing = repo.findProduct({ jan: d.jan, isbn: d.isbn, name: d.name, isDemo: true });
      if (existing) continue;
      const p = repo.insertProduct({ name: d.name, category: d.category, jan: d.jan ?? null, isbn: d.isbn ?? null,
        source: 'デモデータ（架空）', isDemo: true, listPrice: d.listPrice ?? null });
      n++;
      for (const o of d.offers) {
        const store = repo.findStoreByOfficialId(o.store);
        repo.insertOffer({ productId: p.id, storeId: store?.id ?? null, price: o.price, condition: o.condition,
          stockStatus: o.status, checkedAt: o.daysAgo == null ? null : iso(o.daysAgo, 10), source: 'デモデータ（架空）', isDemo: true });
      }
      const add = (marketplace: 'mercari' | 'yahoo_fleamarket' | 'amazon_used', v?: DemoItem['mercari']) => {
        if (!v) return;
        for (const t of ['listing', 'sold', 'estimate'] as const) {
          const price = v[t];
          if (price == null) continue;
          repo.insertPrice({ productId: p.id, marketplace, priceType: t, price, sampleCount: t === 'listing' ? 1 : 5,
            observedAt: iso(t === 'sold' ? 1 : 0, 9), source: 'デモデータ（架空）', isDemo: true });
        }
      };
      add('mercari', d.mercari);
      add('yahoo_fleamarket', d.yahoo);
      add('amazon_used', d.amazon);
    }
  });
  return n;
}
