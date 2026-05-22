import { describe, it, expect, afterEach } from 'vitest';
import './mp-card-footer.element';
import { MpCardFooterElement } from './mp-card-footer.element';
function makeFooter(attrs: Record<string, string> = {}): MpCardFooterElement {
  const el = document.createElement('mp-card-footer') as MpCardFooterElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe('mp-card-footer', () => {
  let el: MpCardFooterElement;
  afterEach(() => el?.remove());

  it('adds the `card-footer` class on connect', () => {
    el = makeFooter();
    expect(el.classList.contains('card-footer')).toBe(true);
  });

  it('applies `text-bg-success` when color="success"', () => {
    el = makeFooter({ color: 'success' });
    expect(el.classList.contains('text-bg-success')).toBe(true);
  });

  it('swaps text-bg-* on color change', () => {
    el = makeFooter({ color: 'success' });
    expect(el.classList.contains('text-bg-success')).toBe(true);
    el.setAttribute('color', 'warning');
    expect(el.classList.contains('text-bg-success')).toBe(false);
    expect(el.classList.contains('text-bg-warning')).toBe(true);
  });
});
