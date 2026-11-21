/** 文字列テンプレートでHTMLを組み立てる。埋め込み値は自動でエスケープ（raw() で囲んだものだけそのまま）。 */
export class Raw { constructor(readonly value: string) {} }
export const raw = (s: string) => new Raw(s);

export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

type Part = string | number | boolean | null | undefined | Raw | Part[];
function render(v: Part): string {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

export function html(strings: TemplateStringsArray, ...vals: Part[]): Raw {
  let out = '';
  strings.forEach((s, i) => { out += s + (i < vals.length ? render(vals[i]) : ''); });
  return new Raw(out);
}

export function mount(el: Element, content: Raw) { el.innerHTML = content.value; }

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

export function options(values: readonly string[], selected: string | undefined, labels?: Record<string, string>, empty?: string): Raw {
  return html`${empty !== undefined ? html`<option value="">${empty}</option>` : ''}${values.map((v) =>
    html`<option value="${v}" ${v === selected ? raw('selected') : ''}>${labels?.[v] ?? v}</option>`)}`;
}

export function toast(message: string, kind: 'ok' | 'error' = 'ok') {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2 text-sm shadow-lg ${kind === 'ok' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...a: A) => { if (t) clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
