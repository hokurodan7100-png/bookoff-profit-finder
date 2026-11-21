# アーキテクチャ

## 1. 技術構成と推奨構成からの変更理由

| 推奨 | 採用 | 理由 |
|---|---|---|
| Next.js | Node.js 22 標準 `http` ＋ 自作の小さなルーター | 開発環境が外部ネットワーク遮断で `npm install` 不可。Next.jsが入手できないため、依存ゼロで動く構成にした。API層は `src/server/api.ts` に閉じているため、Next.js Route Handlers への移植は機械的に可能 |
| TypeScript | TypeScript（strict） | 推奨どおり |
| Tailwind CSS | Tailwind CSS v4（`compile()` API をビルドスクリプトから直接呼ぶ） | 推奨どおり。CLIパッケージが無いためコアAPIでビルド |
| React（Next.js前提） | フレームワークなしのTypeScript（DOM直接） | Reactの型定義が環境に無く、型チェックを通せないため。画面は `src/client/views/*` に分割しておりReact化は容易 |
| PostgreSQL + Prisma | SQLite（Node.js 標準 `node:sqlite`）＋ Repository層 | Prisma・pgドライバが入手不可。SQLはPostgreSQL互換を意識（`TEXT`/`INTEGER`/`REAL`、ISO8601文字列日時）。`Repository` インターフェース経由なので Prisma 実装を追加して差し替える |
| Vitest | Node.js 標準 `node:test` ＋ tsx | Vitestが入手不可。`describe/it/assert` の書き方はVitestへ移行しやすい |
| Playwright | Playwright（ライブラリAPI ＋ `node:test`） | `@playwright/test` ランナーが無いためライブラリAPIで実行 |

ネットワークのある環境では `docs/tasks.md` の「推奨構成への移行」を実施する。

## 2. ディレクトリ

```
src/
  shared/        画面・サーバ共通（型、利益計算、CSV、絞り込み、定数）
  server/
    db.ts        スキーマ作成・マイグレーション
    repository.ts データアクセス（SQLite実装）
    service.ts   一覧行の組み立て（相場選択＋利益計算）
    importers.ts CSV取込（検証・upsert）
    seed.ts      店舗マスタ初期投入・デモデータ
    providers/   取得元Provider（交換可能）
    api.ts       HTTPルーティング
    main.ts      起動
  client/        画面（ハッシュルーター、views）
data/stores.seed.json  公式店舗一覧スナップショット
tests/unit, tests/e2e
```

## 3. データモデル

```
stores(id, official_id, name, brand_type, brand_group, prefecture, address,
       official_url, status, successor_store_id, verified_at, source, note,
       created_at, updated_at)
store_events(id, store_id, event_type[open|close|move|rename|verify],
             before_json, after_json, occurred_at, source)
products(id, name, jan, isbn, category, image_url, source, is_demo,
         shipping_override, other_cost_override, created_at, updated_at)
stock_offers(id, product_id, store_id?, price, condition, stock_status,
             checked_at, source, is_demo, created_at)
market_prices(id, product_id, marketplace[mercari|yahoo_fleamarket],
              price_type[listing|sold|estimate], price, sample_count,
              observed_at, source, is_demo, note, created_at)
settings(key, value_json, updated_at)
```

- 出品価格・売却済み価格・推定相場は `price_type` で別レコード。上書きせず履歴として蓄積し、表示は種別ごとの最新値。
- 閉店・移転・改称は `stores.status` と `store_events` で表現（物理削除しない）。

## 4. Provider インターフェース

```ts
interface MarketPriceProvider {
  id: string; marketplace: 'mercari' | 'yahoo_fleamarket';
  label: string; status: 'implemented' | 'not_implemented';
  method: 'csv' | 'manual' | 'api';
  reason?: string;                       // 未実装の理由
  fetchPrices(q: MarketQuery): Promise<MarketPriceInput[]>; // 未実装は NotImplementedError
}
interface InventoryProvider { ...同様（BOOKOFF在庫） }
interface StoreProvider { ...（店舗マスタ） }
```

`src/server/providers/registry.ts` が一覧を持ち、`/api/providers` と「データ取得元」画面に状態をそのまま表示する。未実装Providerを呼ぶと 501 を返す。

## 5. 一覧行の計算フロー

1. `stock_offers` を基準に行を作る（在庫情報のない商品は店舗「未取得」の1行）。
2. 販路ごとに、価格種別の優先順位（設定）で最新の相場を選ぶ。
3. `calcProfit()` で販路別に利益・利益率・投資利益率を計算し、利益が大きい方を「有利な販路」とする。
4. `applyFilters()` / `sortRows()` で絞り込み・並び替え（共通コード）。

第一段階はアプリ層で絞り込む。データが数万行を超えたらSQLへ移す（tasks.md）。

## 6. API

| メソッド | パス | 内容 |
|---|---|---|
| GET | /api/meta | 定数・件数 |
| GET | /api/items | 一覧（絞り込み・並び替えはクエリ、offset/limitでページ送り） |
| GET | /api/export.csv | 一覧CSV（同じクエリ） |
| GET | /api/products/:id | 商品詳細（在庫・相場履歴） |
| POST | /api/products | 商品手動登録 |
| PUT/DELETE | /api/products/:id | 商品の編集・削除 |
| DELETE | /api/offers/:id, /api/market-prices/:id | 在庫・相場の削除 |
| GET | /api/store-summary | 店舗別集計 |
| POST | /api/offers | 在庫・価格手動登録 |
| POST | /api/market-prices | 相場手動登録 |
| POST | /api/import/{products\|market\|stores} | CSV取込 |
| GET | /api/stores | 店舗マスタ |
| GET/PUT | /api/settings | 手数料・送料等 |
| GET | /api/providers | 取得元の実装状況 |
| POST/DELETE | /api/demo | デモデータ投入／削除 |
| POST | /api/providers/:id/fetch | Provider実行（未実装は501） |

## 7. 認証と配布

- 認証は `src/server/auth.ts`。方式は次の優先順で自動で決まる（`GET /api/me` の `authMode`）。
  1. `users` 表に1人以上 → **ユーザー別のBasic認証**（accounts）。パスワードは scrypt（ソルト付き）で保存し、API・画面・ログには出さない。
  2. `APP_PASSWORD` あり → 共有パスワード（password、ユーザー名は任意、管理者扱い、比較は定数時間）。
  3. どちらも無し → 認証なし（none、管理者扱い）。
- 権限：`admin`（ユーザー管理・設定・店舗マスタCSV・デモ）／`editor`（商品・在庫・相場の登録・削除、CSV取込、統合、自動取得）／`viewer`（GETのみ。CSV出力可）。判定は `requiredRole()`。不足は403。
- 最後の管理者は降格・削除できない（ただし唯一のユーザーなら削除でき、元の方式に戻る）。最初のユーザーは管理者に限る。
- 同じ接続元からパスワードの間違いが15分に10回で429（15分ロック）。認証済みヘッダは10分キャッシュ（ユーザー変更時に破棄）。
- **HTTPS**：`TLS_CERT_FILE` と `TLS_KEY_FILE`（PEM）を両方指定すると `node:https` で待ち受け、HSTSヘッダを付ける。インターネット公開時は、Let's Encrypt 等の証明書を指定するか、Caddy・nginx などHTTPSのリバースプロキシの後ろに置く（その場合は `HOST=127.0.0.1` にしてプロキシ経由だけにする）。Basic認証はHTTPだと盗聴されうるため、公開時はHTTPS必須。
- API：`GET /api/me`、`GET/POST /api/users`、`PUT/DELETE /api/users/:id`（管理者のみ）。
- `dist/main.mjs` は依存（zod・店舗データ）を同梱した単一ファイル。`dist/public` と合わせ、Node.js 22.13以上だけで動く。
- 起動スクリプトは `node --env-file-if-exists=config.env dist/main.mjs` を実行する。
