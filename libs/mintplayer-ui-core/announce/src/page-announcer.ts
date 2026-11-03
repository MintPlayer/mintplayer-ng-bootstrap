import type { Politeness } from './announcer';

/**
 * A page-level live region for a component that has no live node of its own to
 * speak through (#458 M6: the toast, whose node is hidden until it shows).
 *
 * One visually-hidden region per politeness per document, appended to `<body>`
 * on first use and kept. The text is set on a later macrotask, so even the
 * first message lands in a region that already existed (a region created in
 * the same task as its text is unreliably announced), and a repeat of the same
 * message is blanked first. Client only; a no-op without a body.
 */
const REGION_ATTR = 'data-mp-page-announcer';
const DELAY_MS = 100;
const CLEAR_MS = 5000;

const timers = new WeakMap<Element, { set?: ReturnType<typeof setTimeout>; clear?: ReturnType<typeof setTimeout> }>();

function region(doc: Document, politeness: Politeness): HTMLElement | null {
  const existing = doc.querySelector<HTMLElement>(`[${REGION_ATTR}="${politeness}"]`);
  if (existing || !doc.body) return existing;
  const node = doc.createElement('div');
  node.setAttribute(REGION_ATTR, politeness);
  node.setAttribute('aria-live', politeness);
  node.setAttribute('aria-atomic', 'true');
  node.className = 'visually-hidden';
  doc.body.appendChild(node);
  return node;
}

export function announceToPage(doc: Document, message: string, politeness: Politeness = 'polite'): void {
  const text = message.trim();
  const node = text ? region(doc, politeness) : null;
  if (!node) return;
  const pending = timers.get(node) ?? {};
  clearTimeout(pending.set);
  clearTimeout(pending.clear);
  node.textContent = '';
  pending.set = setTimeout(() => {
    node.textContent = text;
    pending.clear = setTimeout(() => (node.textContent = ''), CLEAR_MS);
  }, DELAY_MS);
  timers.set(node, pending);
}
