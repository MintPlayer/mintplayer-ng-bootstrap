import { describe, it, expect, afterEach } from 'vitest';
import './mp-card.element';
import { MpCardElement } from './mp-card.element';

function makeCard(attrs: Record<string, string> = {}, inner = ''): MpCardElement {
  const el = document.createElement('mp-card') as MpCardElement;
  Object.entries(attrs).map(([k, v]) => el.setAttribute(k, v));
  el.innerHTML = inner;
  document.body.appendChild(el);
  return el;
}

describe('mp-card', () => {
  let el: MpCardElement;
  afterEach(() => el?.remove());

  it('is the Bootstrap card itself, in the light DOM, children untouched', async () => {
    el = makeCard({}, '<div class="card-body">x</div>');
    const body = el.firstElementChild;
    await el.updateComplete;
    expect(el.shadowRoot).toBeNull();
    expect(el.classList.contains('card')).toBe(true);
    expect(el.firstElementChild).toBe(body);
  });

  it('maps color and outline onto Bootstrap classes, and swaps them on change', async () => {
    el = makeCard({ color: 'primary' });
    await el.updateComplete;
    expect([...el.classList]).toEqual(['card', 'text-bg-primary', 'border-primary']);
    el.outline = true;
    el.color = 'danger';
    await el.updateComplete;
    expect([...el.classList]).toEqual(['card', 'bg-transparent', 'border-danger']);
  });

  it('keeps a consumer class', async () => {
    el = makeCard({ class: 'h-100', color: 'info' });
    await el.updateComplete;
    el.color = null;
    await el.updateComplete;
    expect([...el.classList]).toEqual(['h-100', 'card']);
  });
});
