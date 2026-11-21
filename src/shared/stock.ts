import type { StockStatus } from './constants.ts';

/** 確認から日数が経った「在庫あり」を表す表示用の状態（DBには保存しない） */
export const STALE_STOCK = '要再確認' as const;
export type EffectiveStockStatus = StockStatus | typeof STALE_STOCK;
export const FILTER_STOCK_STATUSES: EffectiveStockStatus[] = ['在庫あり（確認済）', STALE_STOCK, '在庫なし（確認済）', '在庫未確認'];

const DAY = 86400000;

/**
 * 在庫の実効状態。「在庫あり（確認済）」でも、確認から freshDays 日を過ぎたら「要再確認」。
 * freshDays が 0 なら鮮度判定をしない。ageDays は確認からの経過日数（切り捨て）。
 */
export function effectiveStock(
  offer: { stockStatus: StockStatus; checkedAt: string | null } | null | undefined,
  freshDays: number,
  now = Date.now(),
): { status: EffectiveStockStatus; ageDays: number | null } {
  if (!offer) return { status: '在庫未確認', ageDays: null };
  const t = offer.checkedAt ? Date.parse(offer.checkedAt) : NaN;
  const ageMs = Number.isNaN(t) ? null : Math.max(0, now - t);
  const ageDays = ageMs == null ? null : Math.floor(ageMs / DAY);
  if (offer.stockStatus === '在庫あり（確認済）' && freshDays > 0 && ageMs != null && ageMs > freshDays * DAY) {
    return { status: STALE_STOCK, ageDays };
  }
  return { status: offer.stockStatus, ageDays };
}

export function ageLabel(ageDays: number | null): string {
  if (ageDays == null) return '';
  return ageDays === 0 ? '今日確認' : `${ageDays}日前に確認`;
}
