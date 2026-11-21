/** RFC 4180 準拠の最小CSVパーサ／シリアライザ（依存なし） */

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export interface CsvRecord { line: number; values: Record<string, string> }

/** 1行目をヘッダとして辞書化。line は元ファイル上の行番号（ヘッダ=1） */
export function parseCsvRecords(text: string): { headers: string[]; records: CsvRecord[] } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((r, i) => {
    const values: Record<string, string> = {};
    headers.forEach((h, j) => { values[h] = (r[j] ?? '').trim(); });
    return { line: i + 2, values };
  });
  return { headers, records };
}

function escapeField(v: unknown): string {
  const s = v == null ? '' : String(v);
  // CSVインジェクション対策：数式として解釈される先頭文字を無害化
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: unknown[][], withBom = true): string {
  const body = [headers, ...rows].map((r) => r.map(escapeField).join(',')).join('\r\n');
  return (withBom ? '﻿' : '') + body + '\r\n';
}

/** ブラウザ側：UTF-8として不正ならShift_JISで読む */
export function decodeCsvBytes(bytes: Uint8Array): { text: string; encoding: 'utf-8' | 'shift_jis' } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('shift_jis').decode(bytes), encoding: 'shift_jis' };
  }
}
