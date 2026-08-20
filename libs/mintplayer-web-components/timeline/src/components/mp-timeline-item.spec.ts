import { afterEach, describe, expect, it } from 'vitest';

import './mp-timeline-item';
import type { MpTimelineItem } from './mp-timeline-item';

/**
 * `<mp-timeline-item>` exposes every data field as **both** an attribute and a
 * property, and keeps the two in step in both directions. That is what lets
 * three frameworks drive it: Angular writes attributes, React and Vue write
 * properties for anything they find on the prototype, and plain HTML writes
 * attributes only.
 *
 * A two-way mirror is also where the bugs live. A setter that reflects, an
 * `attributeChangedCallback` that adopts, and each feeding the other is an echo
 * loop waiting to happen — and the specific hazard here is that an attribute is
 * always a *string*, so a numeric id round-tripping through one silently
 * becomes `"7"`.
 */

const mounted: MpTimelineItem[] = [];

function mount(markup?: string): MpTimelineItem {
  const host = document.createElement('div');
  host.innerHTML = markup ?? '<mp-timeline-item></mp-timeline-item>';
  document.body.appendChild(host);
  const item = host.querySelector('mp-timeline-item') as MpTimelineItem;
  mounted.push(item);
  return item;
}

async function settle(item: MpTimelineItem): Promise<void> {
  await item.updateComplete;
}

const shadow = (item: MpTimelineItem, selector: string) =>
  item.shadowRoot!.querySelector(selector);

afterEach(() => {
  while (mounted.length) mounted.pop()!.closest('div')?.remove();
  document.body.innerHTML = '';
});

describe('mp-timeline-item — role', () => {
  // Standalone or declarative use has to be meaningful on its own; the parent
  // timeline upgrades this to `option` when it is selectable.
  it('names itself a list item by default', () => {
    expect(mount().getAttribute('role')).toBe('listitem');
  });

  it('never overrides a role the consumer wrote', () => {
    expect(mount('<mp-timeline-item role="option"></mp-timeline-item>').getAttribute('role')).toBe(
      'option',
    );
  });
});

describe('mp-timeline-item — property writes reach the attribute', () => {
  it.each([
    ['description', 'description', 'A description'],
    ['time', 'time', '2026-05-01'],
    ['icon', 'icon', 'bi bi-check'],
    ['color', 'color', '#198754'],
    ['itemClass', 'item-class', 'highlight'],
  ])('reflects %s onto the %s attribute', (property, attribute, value) => {
    const item = mount();
    (item as unknown as Record<string, unknown>)[property] = value;
    expect(item.getAttribute(attribute)).toBe(value);
  });

  it('removes the attribute when the property is cleared', () => {
    const item = mount();
    item.description = 'text';
    item.description = null;
    expect(item.hasAttribute('description')).toBe(false);
  });

  it('treats undefined as cleared', () => {
    const item = mount();
    item.description = 'text';
    item.description = undefined as unknown as null;
    expect(item.description).toBeNull();
  });

  it.each([
    ['disabled', 'disabled'],
    ['selected', 'selected'],
  ])('reflects %s as a bare boolean attribute', (property, attribute) => {
    const item = mount();
    (item as unknown as Record<string, unknown>)[property] = true;
    expect(item.getAttribute(attribute)).toBe('');

    (item as unknown as Record<string, unknown>)[property] = false;
    expect(item.hasAttribute(attribute)).toBe(false);
  });

  it('coerces a truthy value to a real boolean', () => {
    const item = mount();
    item.disabled = 'yes' as unknown as boolean;
    expect(item.disabled).toBe(true);
  });
});

describe('mp-timeline-item — attribute writes reach the property', () => {
  it.each([
    ['description', 'description'],
    ['time', 'time'],
    ['icon', 'icon'],
    ['color', 'color'],
    ['item-class', 'itemClass'],
  ])('adopts the %s attribute into %s', (attribute, property) => {
    const item = mount();
    item.setAttribute(attribute, 'value');
    expect((item as unknown as Record<string, unknown>)[property]).toBe('value');
  });

  it('adopts a removed attribute as null', () => {
    const item = mount('<mp-timeline-item description="x"></mp-timeline-item>');
    item.removeAttribute('description');
    expect(item.description).toBeNull();
  });

  it.each(['disabled', 'selected'])('adopts %s by presence', (attribute) => {
    const item = mount();
    item.setAttribute(attribute, '');
    expect((item as unknown as Record<string, boolean>)[attribute]).toBe(true);

    item.removeAttribute(attribute);
    expect((item as unknown as Record<string, boolean>)[attribute]).toBe(false);
  });

  it('reads attributes present in the initial markup', () => {
    const item = mount(
      '<mp-timeline-item description="D" time="T" icon="I" color="C" item-class="K" disabled></mp-timeline-item>',
    );
    expect(item.description).toBe('D');
    expect(item.time).toBe('T');
    expect(item.icon).toBe('I');
    expect(item.color).toBe('C');
    expect(item.itemClass).toBe('K');
    expect(item.disabled).toBe(true);
  });
});

describe('mp-timeline-item — the item id', () => {
  it('reflects a string id', () => {
    const item = mount();
    item.itemId = 'ship';
    expect(item.getAttribute('item-id')).toBe('ship');
    expect(item.itemId).toBe('ship');
  });

  /*
   * The reason the id has a bespoke round-trip rule. Setting the property
   * reflects it to an attribute, which echoes straight back into
   * `attributeChangedCallback` — and an attribute is a string, so adopting it
   * unconditionally would turn every numeric id into its decimal text. A
   * consumer keying rows by a numeric id would then find its lookups failing
   * on identity, with the id looking correct in the DOM inspector.
   */
  it('keeps a numeric id a number through the attribute round-trip', () => {
    const item = mount();
    item.itemId = 7;
    expect(item.getAttribute('item-id')).toBe('7');
    expect(item.itemId).toBe(7);
  });

  it('adopts an externally written id as the string it is', () => {
    const item = mount();
    item.setAttribute('item-id', '7');
    expect(item.itemId).toBe('7');
  });

  // A leading zero is meaningful in an id like an order number, and coercing to
  // a number would eat it.
  it('keeps a zero-padded id verbatim', () => {
    const item = mount();
    item.setAttribute('item-id', '007');
    expect(item.itemId).toBe('007');
  });

  it('clears the attribute for a null id', () => {
    const item = mount();
    item.itemId = 'ship';
    item.itemId = null;
    expect(item.hasAttribute('item-id')).toBe(false);
  });

  it('reads an id from the initial markup', () => {
    expect(mount('<mp-timeline-item item-id="ship"></mp-timeline-item>').itemId).toBe('ship');
  });
});

describe('mp-timeline-item — what it renders', () => {
  it('falls back to the attributes when nothing is slotted', async () => {
    const item = mount(
      '<mp-timeline-item title="Shipped" description="Body" time="2026"></mp-timeline-item>',
    );
    await settle(item);

    expect(shadow(item, '.title')!.textContent).toContain('Shipped');
    expect(shadow(item, '.body')!.textContent).toContain('Body');
    expect(shadow(item, '.opposite')!.textContent).toContain('2026');
  });

  it('renders an icon glyph, hidden from assistive tech', async () => {
    const item = mount('<mp-timeline-item icon="bi bi-check"></mp-timeline-item>');
    await settle(item);

    const glyph = shadow(item, '.marker-dot i')!;
    expect(glyph.className).toBe('bi bi-check');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a bare marker dot with no icon', async () => {
    const item = mount();
    await settle(item);
    expect(shadow(item, '.marker-dot')).not.toBeNull();
    expect(shadow(item, '.marker-dot i')).toBeNull();
  });

  it('puts the consumer class on the row', async () => {
    const item = mount('<mp-timeline-item item-class="highlight"></mp-timeline-item>');
    await settle(item);
    expect(shadow(item, '.item')!.classList.contains('highlight')).toBe(true);
  });

  it('re-renders when a field changes after mount', async () => {
    const item = mount();
    await settle(item);

    item.description = 'Later';
    await settle(item);

    expect(shadow(item, '.body')!.textContent).toContain('Later');
  });

  /*
   * There is no default slot, deliberately. A default slot would be claimed by
   * whatever whitespace the consumer's formatter left between the tags — which
   * both suppresses the attribute fallback and leaves the real slotted content
   * with no box to render in.
   */
  it('exposes only named slots', async () => {
    const item = mount();
    await settle(item);

    const slots = [...item.shadowRoot!.querySelectorAll('slot')];
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => slot.hasAttribute('name'))).toBe(true);
  });

  it('offers both opposite and timestamp as names for the same region', async () => {
    const item = mount();
    await settle(item);

    const names = [...item.shadowRoot!.querySelectorAll('.opposite slot')].map((s) =>
      s.getAttribute('name'),
    );
    expect(names).toEqual(['opposite', 'timestamp']);
  });
});

describe('mp-timeline-item — the accent colour', () => {
  // The colour has to reach CSS, and a per-item value can only get there
  // through a custom property on the host.
  it('publishes the colour as a custom property', async () => {
    const item = mount();
    item.color = '#198754';
    await settle(item);
    expect(item.style.getPropertyValue('--mp-tl-item-color')).toBe('#198754');
  });

  it('withdraws the custom property when the colour is cleared', async () => {
    const item = mount();
    item.color = '#198754';
    await settle(item);

    item.color = null;
    await settle(item);

    expect(item.style.getPropertyValue('--mp-tl-item-color')).toBe('');
  });

  it('publishes a colour that arrived as an attribute', async () => {
    const item = mount('<mp-timeline-item color="red"></mp-timeline-item>');
    await settle(item);
    expect(item.style.getPropertyValue('--mp-tl-item-color')).toBe('red');
  });
});

describe('mp-timeline-item — layout attributes are the parent business', () => {
  // `side`, `orientation` and `last` are written by the timeline and read only
  // by CSS. They are observed so a change repaints, but they have no backing
  // property — a consumer setting them by hand would be fighting the parent.
  it.each(['side', 'orientation', 'last'])('accepts %s without inventing a property for it', (name) => {
    const item = mount();
    item.setAttribute(name, 'x');
    expect(item.getAttribute(name)).toBe('x');
    expect((item as unknown as Record<string, unknown>)[name]).toBeUndefined();
  });
});
