import { NA } from './constants.ts';

export function yen(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return NA;
  return `${v < 0 ? '−' : ''}¥${Math.abs(v).toLocaleString('ja-JP')}`;
}

export function signedYen(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return NA;
  return v > 0 ? `+${yen(v)}` : yen(v);
}

export function percent(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return NA;
  return `${v.toFixed(1)}%`;
}

export function jstDateTime(iso: string | null | undefined): string {
  if (!iso) return NA;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return NA;
  const d = new Date(t + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function orNA(v: string | null | undefined): string {
  return v == null || v === '' ? NA : v;
}
