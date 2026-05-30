import { describe, it, expect, afterEach } from 'vitest';
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

  it('upgrades to a shadow-DOM element rendering a default slot', async () => {
    el = makeCard();
    expect(el).toBeInstanceOf(MpCardElement);
    await el.updateComplete;
    expect(el.shadowRoot).toBeTruthy();
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('reflects the `color` property to the attribute and reads it back', async () => {
    el = makeCard({ color: 'primary' });
    await el.updateComplete;
    expect(el.color).toBe('primary'); // attribute -> property
    el.color = 'success';
    await el.updateComplete;
    expect(el.getAttribute('color')).toBe('success'); // property -> attribute
  });

  it('reflects the boolean `outline` attribute and property', async () => {
    el = makeCard({ color: 'danger', outline: '' });
    await el.updateComplete;
    expect(el.outline).toBe(true);
    el.outline = false;
    await el.updateComplete;
    expect(el.hasAttribute('outline')).toBe(false);
  });

  it('injects the global card sheet into document.head exactly once', () => {
    el = makeCard();
    expect(document.head.querySelectorAll('style[data-mp-card]').length).toBe(1);
    const el2 = makeCard();
    expect(document.head.querySelectorAll('style[data-mp-card]').length).toBe(1);
    el2.remove();
  });
});
