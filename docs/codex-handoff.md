# Codex への引き継ぎ（2026-11-21 時点）

## 準備（初回のみ）

1. Node.js 22.13 以上を入れる（https://nodejs.org/ja の LTS）
2. Codex CLI を公式の手順で入れる（例：`npm install -g @openai/codex`）
3. このフォルダでターミナルを開き、`codex` を起動する

Codex は最初に `AGENTS.md`（守るべき制約）を読みます。下の依頼文から1つ選んで貼り付けてください。

## 現在の状態

- 完成報告：`docs/report.md`（機能一覧・未実装・制約・テスト結果）
- テスト：単体81件・E2E17件がすべて成功（`npm run check`）
- 構成：Node標準http＋SQLite＋素のTypeScript＋Tailwind v4（開発環境の制約による。推奨構成への移行は依頼2）
- 配布：`dist/` 同梱。`起動（Windows）.bat` / `起動（Mac）.command` で起動

---

## 依頼1：Windows／Macでの起動確認と修正（最優先）

```
AGENTS.md と README.md を読んでから作業してください。
このアプリは Linux でしか動作確認していません。この PC で次を確認し、問題があれば直してください。
1. 「起動（Windows）.bat」（Mac なら「起動（Mac）.command」）をそのまま実行し、ブラウザで http://localhost:3000 が開いて一覧が表示されるか
2. 日本語の表示が文字化けしないか、フォルダ名に日本語や空白が含まれていても動くか
3. config.env に APP_PASSWORD を設定したとき、パスワードを聞かれるか
   - 「設定」→「ユーザー」で管理者を作ると、次からユーザー名とパスワードを聞かれるか（閲覧のみのユーザーでは登録できないか）
4. npm install のあと npm run check（型チェック・単体・E2E）がすべて通るか（E2E 用に npx playwright install chromium）
直した点と、確認結果（OS・Node のバージョン含む）を報告してください。
```

## 依頼2：Keepa（Amazon中古価格・定価）の本番接続確認

```
AGENTS.md と docs/data-sources.md の「Amazon中古価格」を読んでから作業してください。
config.env に KEEPA_API_KEY を設定して起動し、データ取得元画面の「一括取得」を数件の商品で実行して、
src/server/providers/keepa.ts が実際の Keepa API 応答（domain=5, stats=90, current[2]=中古, avg90[2], current[4]=定価）を正しく解釈できるか確認してください。
- 応答形式が想定と違えば修正し、tests/unit/amazon.test.ts のフェイク応答も実物に合わせて更新する
- トークン消費量（tokensLeft）を取得結果に表示する
- APIキーをログや画面に出さないこと
- npm run check を通す
```

## 依頼3：推奨構成への移行

```
AGENTS.md と docs/ を読んでから作業してください。
このアプリは Node標準http＋SQLite＋node:test で作られています。
推奨構成（Next.js App Router / TypeScript / Tailwind CSS / PostgreSQL / Prisma / Vitest / Playwright）へ段階的に移行してください。
1. まず npm install と npm run check で現状のテストが全部通ることを確認する
2. prisma/schema.prisma を src/server/db.ts のスキーマ（v3：定価列を含む）と同じ内容で作り、PrismaRepository を実装する（src/server/repository.ts と同じメソッド）。DATABASE_URL があれば Prisma、なければ SQLite
3. tests/unit を Vitest に移す
4. src/server/api.ts の各ルート（src/server/auth.ts の認証・権限を含む）を Next.js の Route Handlers に移す。src/shared はそのまま再利用
5. 画面（src/client/views）をページ／コンポーネントに移す。見た目と data-testid を維持し、tests/e2e を @playwright/test に移して通す
6. docker-compose.yml で PostgreSQL を起動できるようにし、README と起動スクリプトを更新する
AGENTS.md の「守るべき制約」は変更しないこと。各段階で型チェックとテストを通し、最後に変更点・未対応点・テスト結果を報告してください。
```

## 依頼4：推定相場の自動算出（2026-11-21 実装済み）

```
AGENTS.md を読んでから作業してください。
登録済みの売却済み価格（market_prices の price_type=sold）から、販路ごとに直近N日（設定画面で変更可、既定30日）の中央値と件数を計算し、推定相場（estimate）として保存する機能を追加してください。
外部へのアクセスは追加しないこと。単体テストを追加し、npm run check を通してください。
```

## 結果を Claude に戻すとき（自動連携）

`codex/<作業名>` ブランチにプッシュし、Claude に「Codexの変更を取り込んで」と伝えると確認して取り込みます（AGENTS.md「Claude との連携ルール」）。以下は手動で渡す場合。


Codex の報告文（変更点・テスト結果）をチャットに貼るか、作業後のフォルダを zip にして添付してください。レビューと不具合修正を引き継ぎます。
