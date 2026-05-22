import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './mp-card.element';
import { MpCardElement } from './mp-card.element';
function makeCard(attrs: Record<string, string> = {}): MpCardElement {
  const el = document.createElement('mp-card') as MpCardElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe('mp-card', () => {
  let el: MpCardElement;
  afterEach(() => el?.remove());

  it('adds the `card` class on connect', () => {
    el = makeCard();
    expect(el.classList.contains('card')).toBe(true);
  });

  it('applies `text-bg-primary` when color="primary" (filled)', () => {
    el = makeCard({ color: 'primary' });
    expect(el.classList.contains('text-bg-primary')).toBe(true);
    expect(el.classList.contains('border')).toBe(false);
    expect(el.classList.contains('bg-transparent')).toBe(false);
  });

  it('applies `border border-danger bg-transparent` when color + outline', () => {
    el = makeCard({ color: 'danger', outline: '' });
    expect(el.classList.contains('border')).toBe(true);
    expect(el.classList.contains('border-danger')).toBe(true);
    expect(el.classList.contains('bg-transparent')).toBe(true);
    expect(el.classList.contains('text-bg-danger')).toBe(false);
  });

  it('updates classes when color attribute changes', () => {
    el = makeCard({ color: 'primary' });
    expect(el.classList.contains('text-bg-primary')).toBe(true);
    el.setAttribute('color', 'success');
    expect(el.classList.contains('text-bg-success')).toBe(true);
    expect(el.classList.contains('text-bg-primary')).toBe(false);
  });

  it('drops filled class and swaps to outline when outline attribute is added', () => {
    el = makeCard({ color: 'info' });
    expect(el.classList.contains('text-bg-info')).toBe(true);
    el.setAttribute('outline', '');
    expect(el.classList.contains('text-bg-info')).toBe(false);
    expect(el.classList.contains('border-info')).toBe(true);
    expect(el.classList.contains('bg-transparent')).toBe(true);
  });

  it('ignores invalid color values', () => {
    el = makeCard({ color: 'rainbow' });
    expect(el.classList.contains('card')).toBe(true);
    for (const cls of Array.from(el.classList)) {
      expect(cls.startsWith('text-bg-')).toBe(false);
    }
  });

  it('injects bootstrap-card styles into document.head exactly once', () => {
    el = makeCard();
    const styleEls = document.head.querySelectorAll('style[data-mp-card]');
    expect(styleEls.length).toBe(1);
    const el2 = makeCard();
    expect(document.head.querySelectorAll('style[data-mp-card]').length).toBe(1);
    el2.remove();
  });
});
