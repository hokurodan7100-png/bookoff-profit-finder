/** ISBN-10 を ISBN-13（978始まり）に変換する。形式が不正なら null */
export function isbn10to13(isbn10: string): string | null {
  const s = isbn10.toUpperCase();
  if (!/^\d{9}[\dX]$/.test(s)) return null;
  const body = `978${s.slice(0, 9)}`;
  const sum = [...body].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return body + String((10 - (sum % 10)) % 10);
}

/**
 * 商品を同一と判定するためのコード（13桁に正規化）。
 * 書籍のISBN-13はJANと同じ値なので、JAN・ISBNを区別せずに比較する。
 */
export function productCodes(p: { jan: string | null; isbn: string | null }): string[] {
  const out = new Set<string>();
  if (p.jan) out.add(p.jan);
  if (p.isbn) out.add(p.isbn.length === 10 ? isbn10to13(p.isbn) ?? p.isbn : p.isbn);
  return [...out];
}

/** 中央値（偶数件は中央2件の平均を四捨五入） */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
