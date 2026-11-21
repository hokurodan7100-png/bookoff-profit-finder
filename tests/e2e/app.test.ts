import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { chromium, devices, type Browser, type Page } from 'playwright';
import { startServer } from '../../src/server/main.ts';

const SHOTS = 'test-results';
mkdirSync(SHOTS, { recursive: true });

let server: Server; let url: string; let browser: Browser;
before(async () => {
  ({ server, url } = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', publicDir: 'dist/public', demo: true, quiet: true }));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

async function open(page: Page, path = '/') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + path);
  return errors;
}

describe('PC（1366×900）', () => {
  it('既定は「利益が出る商品のみ」：すべて緑', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = await open(page);
    await page.getByTestId('items-table').waitFor();
    assert.ok(await page.locator('input[name=profitOnly]').isChecked());
    assert.match(await page.locator('#result-count').innerText(), /利益が出る商品/);
    const classes = await page.getByTestId('items-table').getByTestId('profit').evaluateAll((els) => els.map((e) => e.className));
    assert.ok(classes.length > 0 && classes.every((c) => c.includes('text-emerald-600')));
    await page.screenshot({ path: join(SHOTS, 'pc-list.png'), fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('全件表示：表形式・利益は緑／損失は赤・未取得表記・デモバナー', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = await open(page, '/#/?profitOnly=0');
    const table = page.getByTestId('items-table');
    await table.waitFor();
    assert.ok(await table.isVisible());
    assert.equal(await page.getByTestId('items-cards').isVisible(), false);
    await page.getByTestId('demo-banner').waitFor();
    const profits = page.getByTestId('items-table').getByTestId('profit');
    const first = await profits.first().getAttribute('class');
    assert.match(first!, /text-emerald-600/);
    const classes = await profits.evaluateAll((els) => els.map((e) => e.className));
    assert.ok(classes.some((c) => c.includes('text-red-600')), '損失行が赤');
    assert.ok((await page.locator('tbody').innerText()).includes('未取得'));
    // 見出し項目
    const head = await page.locator('thead').innerText();
    for (const h of ['商品名', 'BOOKOFF価格', '対象店舗', 'メルカリ相場', 'Yahoo!フリマ相場', 'Amazon中古相場', '想定利益', '利益率', '情報取得日時']) assert.ok(head.includes(h), h);
    await page.screenshot({ path: join(SHOTS, 'pc-list-all.png'), fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('絞り込み・並び替え・URL反映', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await open(page);
    await page.getByTestId('items-table').waitFor();
    const count = () => page.locator('#result-count').innerText();
    await page.selectOption('select[name=prefecture]', '山梨県');
    await page.waitForFunction(() => location.hash.includes('prefecture'));
    await page.waitForTimeout(400);
    const rows = await page.getByTestId('item-row').count();
    assert.ok(rows >= 1);
    const stores = await page.locator('tbody tr td:nth-child(3)').allInnerTexts();
    assert.ok(stores.every((s) => s.includes('山梨県')), stores.join('|'));
    await page.fill('input[name=minProfit]', '100000');
    await page.waitForTimeout(500);
    assert.match(await count(), /利益が出る商品 0件/);
    await page.click('#reset-filters');
    await page.waitForTimeout(500);
    await page.selectOption('#sort', 'price_asc');
    await page.waitForTimeout(400);
    const prices = (await page.locator('tbody tr td:nth-child(2) > div:first-child').allInnerTexts()).map((t) => Number(t.replace(/[^\d]/g, '')));
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    assert.match(await page.locator('#export').getAttribute('href') ?? '', /sort=price_asc/);
    await page.close();
  });

  it('詳細で相場を手動登録すると一覧が再計算される', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await open(page, '/#/?profitOnly=0&q=' + encodeURIComponent('シリーズ3作'));
    await page.getByTestId('item-row').first().waitFor();
    assert.ok((await page.getByTestId('item-row').first().innerText()).includes('未取得'));
    // Amazon中古の推定相場1,500円：DVDは15%＋成約料140円 → 1500−990−365−210 = −65（損失）
    assert.equal(await page.getByTestId('item-row').first().getByTestId('profit').innerText(), '−¥65');
    await page.getByTestId('item-row').first().click();
    const dlg = page.getByTestId('detail-dialog');
    await dlg.waitFor();
    await dlg.locator('#price-form input[name=price]').fill('3000');
    await dlg.locator('#price-form button').click();
    await page.waitForTimeout(500);
    await dlg.getByTestId('calc-mercari').getByText('想定利益').waitFor();
    await page.screenshot({ path: join(SHOTS, 'pc-detail.png') });
    await dlg.locator('[data-close]').click();
    await page.waitForTimeout(300);
    const profit = await page.getByTestId('item-row').first().getByTestId('profit').innerText();
    assert.equal(profit, '+¥1,500'); // 3000 − 990 − 300 − 210
    await page.close();
  });

  it('CSV取込（Shift_JIS）と設定変更', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await open(page, '/#/import');
    const csv = '商品名,JAN,カテゴリ,店舗ID,BOOKOFF価格,在庫状態,在庫確認日時\nE2E実データ商品,4900000099991,ゲーム,shop10145,1000,在庫あり（確認済）,2026-11-20 10:00\n';
    const file = join(tmpdir(), 'e2e-products.csv');
    writeFileSync(file, csv);
    await page.setInputFiles('input[data-import=products]', file);
    await page.getByTestId('import-result').waitFor();
    assert.match(await page.getByTestId('import-result').innerText(), /追加 1/);
    const market = '商品名,JAN,販路,価格種別,価格,取得日時\nE2E実データ商品,4900000099991,Yahoo!フリマ,売却済み価格,2000,2026-11-20 10:00\nE2E実データ商品,4900000099991,ヤフオク,売却済み価格,9000,2026-11-20\n';
    writeFileSync(file, market);
    await page.setInputFiles('input[data-import=market]', file);
    await page.locator('[data-result=market] [data-testid=import-result]').waitFor();
    assert.match(await page.locator('[data-result=market]').innerText(), /使用できません/);
    await page.screenshot({ path: join(SHOTS, 'pc-import.png'), fullPage: true });

    await page.goto(url + '/#/?dataKind=real');
    await page.getByTestId('item-row').first().waitFor();
    assert.equal(await page.getByTestId('item-row').first().getByTestId('profit').innerText(), '+¥690'); // 2000 − 1000 − 100 − 210

    await page.goto(url + '/#/settings');
    await page.fill('input[name="yahoo_fleamarket.fee"]', '0');
    await page.click('#settings-form button');
    await page.waitForTimeout(300);
    await page.goto(url + '/#/?dataKind=real');
    await page.waitForTimeout(600);
    assert.equal(await page.getByTestId('item-row').first().getByTestId('profit').innerText(), '+¥790');
    await page.close();
  });

  it('判定する販路をAmazon中古にすると、Amazonで利益が出る商品だけを表示', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await open(page);
    await page.getByTestId('items-table').waitFor();
    await page.selectOption('select[name=marketplace]', 'amazon_used');
    await page.waitForFunction(() => location.hash.includes('marketplace=amazon_used'));
    await page.waitForTimeout(400);
    const rows = page.getByTestId('item-row');
    assert.ok(await rows.count() >= 1);
    const vias = await page.locator('tbody tr td:nth-child(7) > div:nth-child(2)').allInnerTexts();
    assert.ok(vias.every((v) => v.includes('Amazon中古')), vias.join('|'));
    await page.screenshot({ path: join(SHOTS, 'pc-amazon.png'), fullPage: true });
    await page.close();
  });

  it('「プレミア商品を探す」：Amazon中古とフリマ売却済みの両方で定価超え・定価以下で仕入れ・利益ありをプレミア率順に表示', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await open(page);
    await page.getByTestId('items-table').waitFor();
    await page.click('#premium-preset');
    await page.waitForFunction(() => location.hash.includes('bothOver=1') && location.hash.includes('belowList=1'));
    await page.waitForTimeout(400);
    // 洋楽CDはAmazonでは定価超えだが、フリマの売却済み価格が無いので除外される
    assert.match(await page.locator('#result-count').innerText(), /両方で定価超えの商品 2件/);
    const names = await page.locator('tbody tr td:first-child .font-medium').allInnerTexts();
    assert.deepEqual(names.map((n) => n.replace('サンプル ', '').slice(0, 4)), ['写真集 ', 'アニメ ']);
    const badges = await page.getByTestId('premium-badge').allInnerTexts();
    assert.equal(badges[0], '両方で定価超え Amazon 1.67倍・フリマ 1.02倍');
    // 「両方」を外すとAmazonだけの定価超え（洋楽CD）も表示される
    await page.uncheck('input[name=bothOver]');
    await page.waitForTimeout(500);
    assert.match(await page.locator('#result-count').innerText(), /プレミア商品 3件/);
    await page.check('input[name=bothOver]');
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#sort').inputValue(), 'premium_desc');
    await page.screenshot({ path: join(SHOTS, 'pc-premium.png'), fullPage: true });
    await page.close();
  });

  it('確認待ち：フリマ売却済みが未登録の候補を表示し、登録すると両方で定価超えに入る', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = await open(page, '/#/check');
    await page.getByTestId('check-card').first().waitFor();
    assert.equal(await page.getByTestId('check-card').count(), 1); // 洋楽CD（Amazon2,200円＞定価1,650円、フリマ売却済み無し）
    const card = page.getByTestId('check-card').first();
    assert.match(await card.innerText(), /洋楽/);
    assert.match(await card.locator('a', { hasText: 'メルカリで探す' }).getAttribute('href') ?? '', /^https:\/\/jp\.mercari\.com\/search\?keyword=/);
    await page.screenshot({ path: join(SHOTS, 'pc-check.png'), fullPage: true });
    await card.locator('input[name=price]').fill('1800');
    await card.locator('input[name=sampleCount]').fill('5');
    await card.locator('button').click();
    await page.getByText('両方で定価超えです').waitFor();
    assert.equal(await page.getByTestId('check-card').count(), 0);
    await page.goto(url + '/#/?bothOver=1&belowList=1&premiumOnly=1');
    await page.reload();
    await page.getByTestId('item-row').first().waitFor();
    assert.equal(await page.getByTestId('item-row').count(), 3);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('店舗別：県を選ぶと利益商品のある店舗を想定利益順に表示し、タップでその店舗の商品一覧へ', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = await open(page, '/#/stores');
    await page.getByTestId('stores-table').waitFor();
    await page.selectOption('#st-pref', '静岡県');
    await page.waitForTimeout(200);
    const rows = page.getByTestId('store-row');
    const n = await rows.count();
    assert.ok(n >= 1 && n < 26, `静岡で利益商品のある店舗 ${n}`);
    const sums = (await page.getByTestId('store-profit').allInnerTexts()).map((t) => Number(t.replace(/[^\d-]/g, '')));
    assert.deepEqual(sums, [...sums].sort((a, b) => b - a));
    await page.screenshot({ path: join(SHOTS, 'pc-stores.png'), fullPage: true });
    const name = (await rows.first().locator('td:first-child .font-medium').innerText()).trim();
    await rows.first().click();
    await page.getByTestId('store-chip').waitFor();
    await page.waitForTimeout(400);
    assert.equal((await page.locator('#store-chip-name').innerText()).trim(), name);
    const stores = await page.locator('tbody tr td:nth-child(3) > div:first-child').allInnerTexts();
    assert.ok(stores.length > 0 && stores.every((s) => s.trim() === name), stores.join('|'));
    await page.click('#clear-store');
    await page.waitForTimeout(400);
    assert.equal(await page.getByTestId('store-chip').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('詳細で商品情報を編集し、相場を削除できる', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on('dialog', (d) => d.accept());
    await open(page, '/#/?profitOnly=0&q=' + encodeURIComponent('推理小説'));
    await page.getByTestId('item-row').first().click();
    const dlg = page.getByTestId('detail-dialog');
    await dlg.locator('#edit-product').click();
    await dlg.locator('#edit-form input[name=listPrice]').fill('1200');
    await dlg.locator('#edit-form button.btn-primary').click();
    await dlg.getByText('定価 ¥1,200（手動編集）').waitFor();
    const before = await dlg.locator('[data-del-price]').count();
    await dlg.locator('[data-del-price]').first().click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-del-price]').length === n - 1, before);
    await page.close();
  });

  it('在庫の鮮度：3日を過ぎた在庫ありは「要再確認」。設定で0日にすると無効', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await open(page, '/#/?profitOnly=0&stockStatus=' + encodeURIComponent('要再確認'));
    await page.getByTestId('item-row').first().waitFor();
    const chips = await page.locator('[data-testid=item-row] [data-testid=stock-chip]').allInnerTexts();
    assert.ok(chips.length >= 1 && chips.every((c) => c.startsWith('要再確認') && /日前に確認/.test(c)), chips.join('|'));
    await page.screenshot({ path: join(SHOTS, 'pc-stale.png'), fullPage: true });
    await page.goto(url + '/#/settings');
    await page.reload();
    const s = await (await fetch(`${url}/api/settings`)).json();
    await page.fill('input[name=stockFreshDays]', '0');
    await page.click('#settings-form button');
    await page.waitForTimeout(400);
    await page.goto(url + '/#/?profitOnly=0&stockStatus=' + encodeURIComponent('要再確認'));
    await page.reload();
    await page.locator('#result-count').getByText(/0件/).waitFor();
    await fetch(`${url}/api/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) });
    await page.close();
  });

  it('件数が多いときは「さらに表示」で続きを読み込む', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const lines = ['商品名,JAN,カテゴリ,店舗ID,BOOKOFF価格'];
    const market = ['商品名,JAN,販路,価格種別,価格,取得日時'];
    for (let i = 0; i < 130; i++) {
      const jan = String(4912345000000 + i);
      lines.push(`大量テスト${i},${jan},本,shop10145,100`);
      market.push(`大量テスト${i},${jan},メルカリ,売却済み価格,${1000 + i},2026-11-20`);
    }
    for (const [kind, csv] of [['products', lines], ['market', market]] as const) {
      await fetch(`${url}/api/import/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ csv: csv.join('\n'), filename: 'bulk.csv' }) });
    }
    await open(page, '/#/?q=' + encodeURIComponent('大量テスト'));
    await page.getByTestId('item-row').first().waitFor();
    assert.equal(await page.getByTestId('item-row').count(), 100);
    assert.match(await page.locator('#result-count').innerText(), /100件を表示中/);
    await page.click('#load-more');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=item-row]').length === 130);
    assert.equal(await page.locator('#load-more').count(), 0);
    await page.close();
  });

  it('取込・出力：重複商品を統合し、店舗マスタCSVの差分を保存せずに確認できる', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const csv = ['商品名,JAN,ISBN,カテゴリ,店舗ID,BOOKOFF価格', '重複テスト本,9784101010014,,本,shop10145,100', '重複テスト本（ISBN）,,4101010013,本,shop10259,120'];
    await fetch(`${url}/api/import/products`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ csv: csv.join('\n'), filename: 'dup.csv' }) });
    const errors = await open(page, '/#/import');
    const group = page.getByTestId('dup-group');
    await group.waitFor();
    assert.equal(await group.count(), 1);
    page.once('dialog', (d) => d.accept());
    await group.locator('[data-merge]').first().click();
    await page.getByTestId('dups-empty').waitFor();
    const items = await (await fetch(`${url}/api/items?profitOnly=0&q=${encodeURIComponent('重複テスト本')}`)).json();
    assert.equal(new Set(items.rows.map((r: { product: { id: number } }) => r.product.id)).size, 1);
    assert.equal(items.rows.length, 2); // 2店舗の在庫は1商品にまとまる

    await page.setInputFiles('#store-diff', { name: 'stores.csv', mimeType: 'text/csv',
      buffer: Buffer.from('公式店舗ID,店舗名,都道府県,所在地\nshop99997,BOOKOFF 差分テスト店,静岡県,静岡県静岡市1-1\n') });
    const diff = page.getByTestId('store-diff');
    await diff.waitFor();
    assert.match(await diff.innerText(), /追加 1/);
    assert.equal(await page.getByTestId('store-diff-missing').locator('li').count(), 102);
    const meta = await (await fetch(`${url}/api/meta`)).json();
    assert.equal(meta.counts.stores, 102); // 保存されていない
    await page.screenshot({ path: join(SHOTS, 'pc-import-tools.png'), fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  });

  it('設定：推定相場の期間を表示し、再計算できる', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await open(page, '/#/settings');
    assert.equal(await page.inputValue('input[name=estimateDays]'), '30');
    await page.click('#recompute');
    await page.getByText(/推定相場を\d+件算出しました/).waitFor();
    await page.close();
  });

  it('店舗マスタ・データ取得元（未実装表示）', async () => {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await open(page, '/#/stores');
    await page.getByTestId('stores-table').waitFor();
    await page.uncheck('#st-only');
    assert.equal(await page.locator('[data-testid=stores-table] tbody tr').count(), 102);
    await page.goto(url + '/#/sources');
    await page.getByTestId('providers-table').waitFor();
    const text = await page.getByTestId('providers-table').innerText();
    assert.ok(text.includes('未実装'));
    assert.ok(text.includes('Keepa'));
    assert.ok(text.includes('要APIキー'));
    await page.screenshot({ path: join(SHOTS, 'pc-sources.png'), fullPage: true });
    await page.close();
  });
});

describe('スマートフォン', () => {
  for (const [name, dev] of [['iPhone', devices['iPhone 13']], ['Android', devices['Pixel 7']]] as const) {
    it(`${name}：カード表示・下部ナビ・横スクロールなし`, async () => {
      const ctx = await browser.newContext({ ...dev, isMobile: true, hasTouch: true, defaultBrowserType: undefined } as never);
      const page = await ctx.newPage();
      const errors = await open(page);
      await page.getByTestId('items-cards').waitFor();
      assert.ok(await page.getByTestId('item-card').first().isVisible());
      assert.equal(await page.getByTestId('items-table').isVisible(), false);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `横はみ出し ${overflow}px`);
      await page.screenshot({ path: join(SHOTS, `${name.toLowerCase()}-list.png`) });
      await page.locator('#filter-panel summary').click();
      await page.selectOption('select[name=category]', 'ゲーム');
      await page.waitForTimeout(500);
      const cats = await page.getByTestId('item-card').allInnerTexts();
      assert.ok(cats.length > 0 && cats.every((c) => c.includes('ゲーム')));
      await page.screenshot({ path: join(SHOTS, `${name.toLowerCase()}-filter.png`) });
      await page.goto(url + '/#/?premiumOnly=1&bothOver=1&belowList=1&marketplace=amazon_used&sort=premium_desc');
      await page.reload();
      await page.getByTestId('items-cards').waitFor();
      assert.equal(await page.getByTestId('item-card').count(), 3); // 確認待ちで洋楽CDのフリマ価格を登録済み
      await page.screenshot({ path: join(SHOTS, `${name.toLowerCase()}-premium.png`) });
      await page.goto(url + '/#/stores');
      await page.reload();
      await page.getByTestId('stores-cards').waitFor();
      await page.locator('[data-pref="静岡県"]').click(); // 県のボックスをタップで絞り込み
      await page.waitForTimeout(300);
      assert.ok(await page.getByTestId('store-card').count() >= 1);
      assert.ok((await page.getByTestId('store-card').allInnerTexts()).every((t) => t.includes('静岡県')));
      await page.screenshot({ path: join(SHOTS, `${name.toLowerCase()}-stores.png`) });
      await page.getByTestId('store-card').first().click(); // 店舗をタップ → その店舗の商品一覧
      await page.getByTestId('items-cards').waitFor();
      await page.getByTestId('item-card').first().click();
      await page.getByTestId('detail-dialog').waitFor();
      await page.screenshot({ path: join(SHOTS, `${name.toLowerCase()}-detail.png`) });
      assert.deepEqual(errors, []);
      await ctx.close();
    });
  }
});
