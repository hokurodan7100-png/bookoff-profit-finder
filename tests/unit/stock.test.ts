import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ageLabel, effectiveStock } from '../../src/shared/stock.ts';

const now = Date.parse('2026-11-21T12:00:00+09:00');
const at = (s: string) => new Date(Date.parse(s)).toISOString();

describe('在庫の鮮度', () => {
  it('確認から3日以内の在庫ありはそのまま、3日を過ぎたら要再確認', () => {
    assert.deepEqual(effectiveStock({ stockStatus: '在庫あり（確認済）', checkedAt: at('2026-11-21T09:00:00+09:00') }, 3, now), { status: '在庫あり（確認済）', ageDays: 0 });
    assert.deepEqual(effectiveStock({ stockStatus: '在庫あり（確認済）', checkedAt: at('2026-11-18T12:00:00+09:00') }, 3, now), { status: '在庫あり（確認済）', ageDays: 3 });
    assert.deepEqual(effectiveStock({ stockStatus: '在庫あり（確認済）', checkedAt: at('2026-11-18T11:59:00+09:00') }, 3, now), { status: '要再確認', ageDays: 3 });
  });
  it('在庫なし・未確認は日数が経っても変わらない。0日で無効', () => {
    assert.equal(effectiveStock({ stockStatus: '在庫なし（確認済）', checkedAt: at('2026-10-01T00:00:00Z') }, 3, now).status, '在庫なし（確認済）');
    assert.deepEqual(effectiveStock({ stockStatus: '在庫未確認', checkedAt: null }, 3, now), { status: '在庫未確認', ageDays: null });
    assert.equal(effectiveStock({ stockStatus: '在庫あり（確認済）', checkedAt: at('2026-10-01T00:00:00Z') }, 0, now).status, '在庫あり（確認済）');
    assert.deepEqual(effectiveStock(null, 3, now), { status: '在庫未確認', ageDays: null });
  });
  it('経過日数の表示', () => {
    assert.equal(ageLabel(0), '今日確認');
    assert.equal(ageLabel(5), '5日前に確認');
    assert.equal(ageLabel(null), '');
  });
});
