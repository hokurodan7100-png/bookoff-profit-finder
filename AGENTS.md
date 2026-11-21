# AGENTS.md（Codex など AI エージェント向けの作業ルール）

このリポジトリは「BOOKOFF利益商品検索ツール」。要件は `docs/requirements.md`、設計は `docs/architecture.md`、データ取得の制約は `docs/data-sources.md`、残タスクは `docs/tasks.md`。

## セットアップと確認コマンド

```bash
npm install            # オフライン環境では ./scripts/link-offline-deps.sh
npx playwright install chromium   # E2E用（初回のみ）
npm run typecheck
npm test               # 単体（node:test + tsx）
npm run test:e2e       # ビルド＋E2E（Playwright）
npm run build && npm start   # http://localhost:3000
```

変更後は必ず `npm run check`（型チェック・単体・E2E）を通すこと。

## 守るべき制約（要件由来・変更禁止）

- 対象は静岡県・山梨県・神奈川県のみ。DBのCHECK制約と取込検証の両方で担保している。
- 相場はメルカリ・Yahoo!フリマ・Amazon中古のみ。Yahoo!オークション／Yahoo!ショッピングを代替データにしない（`FORBIDDEN_MARKETPLACE_WORDS`）。
- カメラ撮影による判定機能は作らない（利用者の要望）。
- APIキー（KEEPA_API_KEY など）は環境変数だけで扱い、DB・画面・ログに出さない。
- 出品価格・売却済み価格・推定相場は別レコード（`market_prices.price_type`）。
- 規約に反するスクレイピング、認証回避、アクセス制限回避、非公式APIの利用は実装しない。
- 未実装の自動取得を実装済みに見せない。Provider の `status` を正しく保つ。
- 手数料率などは設定（DB）から読む。計算コードに固定値を書かない（初期値は `src/server/seed.ts` の `DEFAULT_SETTINGS` のみ）。
- 取得できていない値は空欄にせず「未取得」（`NA` 定数）。在庫が確認できないものは「在庫未確認」。
- デモデータは `is_demo=1`。実データと混同させない。

## コード構成の約束

- 共通ロジック（利益計算・CSV・絞り込み）は `src/shared/` に置き、サーバとブラウザで同じコードを使う。
- DBアクセスは `Repository` 経由のみ。
- 画面は `html` タグ付きテンプレート（自動エスケープ）で描画。`raw()` は信頼できる文字列だけに使う。
- ロジックを足したら `tests/unit/`、画面を足したら `tests/e2e/` にテストを追加。

## 新しい取得元（Provider）の追加手順

1. `src/server/providers/` に `MarketPriceProvider` / `InventoryProvider` を実装。
2. `registry.ts` の `PROVIDERS` に登録（自動取得を置き換える場合は `*-auto` を差し替え）。
3. 利用規約・データ利用条件の確認結果を `docs/data-sources.md` に追記。

## Claude との連携ルール（自動連携）

Claude（claude.ai/code）と Codex が同じリポジトリで作業する。GitHub を受け渡し場所にする。

- 統合ブランチは `claude/zen-maxwell-f115t5`。Claude が管理し、Codex の変更もここに取り込む。
- Codex は統合ブランチの最新から `codex/<作業名>` ブランチを作って作業し、そこにプッシュする（統合ブランチや main へ直接プッシュしない）。
  ```bash
  git fetch origin && git switch -c codex/<作業名> origin/claude/zen-maxwell-f115t5
  ```
- コミット前に `npm run check` を通し、`npm run build` で `dist/` も更新してコミットする。GitHub Actions（`.github/workflows/check.yml`）でも同じ確認が自動で走る。
- 作業の報告は `docs/handoff/codex-<作業名>.md` に書いてコミットする（変更点・確認結果・未対応点・Claude に頼みたいこと）。
- Claude は定期的に `codex/*` ブランチを確認し、テストが通れば統合ブランチに取り込み、取り込み結果を `docs/handoff/claude-log.md` に追記する。Codex は作業前にこのログを読む。
- 同じファイルを同時に大きく変えないよう、作業前に `docs/tasks.md` の該当タスクに「（Codex作業中）」と書いてプッシュする。
