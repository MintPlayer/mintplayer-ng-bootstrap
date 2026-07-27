import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpAccordion, type AccordionTabToggleDetail } from './mp-accordion';
import { MpAccordionTab } from './mp-accordion-tab';

void MpAccordion; // force the side-effect registration
void MpAccordionTab;

async function flush(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

interface MakeOptions {
  attrs?: Record<string, string>;
  /** Header labels; one tab is created per entry. */
  tabs?: string[];
  /** Indexes to mark `is-active` up front. */
  active?: number[];
  disabled?: number[];
}

function build({ attrs = {}, tabs = ['One', 'Two', 'Three'], active = [], disabled = [] }: MakeOptions = {}): MpAccordion {
  const el = document.createElement('mp-accordion') as MpAccordion;
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  tabs.forEach((label, index) => {
    const header = document.createElement('span');
    header.setAttribute('accordion-header', '');
    header.textContent = label;
    el.appendChild(header);

    const tab = document.createElement('mp-accordion-tab');
    // Stamped up front, exactly as the framework wrappers (and the SSR HTML)
    // do — <mp-accordion-tab> would otherwise only tag itself on connect.
    tab.setAttribute('accordion-tab', '');
    tab.textContent = `${label} body`;
    if (active.includes(index)) tab.setAttribute('is-active', '');
    if (disabled.includes(index)) tab.setAttribute('disabled', '');
    el.appendChild(tab);
  });
  return el;
}

async function make(options: MakeOptions = {}): Promise<MpAccordion> {
  const el = build(options);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const shadow = (el: MpAccordion) => el.shadowRoot!;
const buttons = (el: MpAccordion) => [...shadow(el).querySelectorAll<HTMLButtonElement>('.accordion-button')];
const items = (el: MpAccordion) => [...shadow(el).querySelectorAll<HTMLElement>('.accordion-item')];
const markers = (el: MpAccordion) => [...el.querySelectorAll<HTMLElement>('[accordion-tab]')];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-accordion projection', () => {
  it('stamps index slots onto headers and tabs, and projects each into its own row', async () => {
    const el = await make();
    expect([...el.children].map((child) => child.getAttribute('slot')))
      .toEqual(['h0', 'c0', 'h1', 'c1', 'h2', 'c2']);

    items(el).forEach((item, index) => {
      const slots = [...item.querySelectorAll('slot')] as HTMLSlotElement[];
      expect(slots.map((slot) => slot.name)).toEqual([`h${index}`, `c${index}`]);
      expect(slots[0].assignedElements()).toEqual([el.children[index * 2]]);
      expect(slots[1].assignedElements()).toEqual([el.children[index * 2 + 1]]);
    });
  });

  it('accepts any direct child tagged accordion-tab, not just mp-accordion-tab', async () => {
    // A framework wrapper's own host element is the marker — it can never
    // render an <mp-accordion-tab> as a direct child of the accordion.
    const el = document.createElement('mp-accordion') as MpAccordion;
    const header = document.createElement('span');
    header.setAttribute('accordion-header', '');
    const tab = document.createElement('bs-accordion-tab');
    tab.setAttribute('accordion-tab', '');
    el.append(header, tab);
    document.body.appendChild(el);
    await flush(el);

    expect(items(el)).toHaveLength(1);
    expect(tab.getAttribute('slot')).toBe('c0');
  });

  it('reacts to tabs being added and removed', async () => {
    const el = await make({ tabs: ['One', 'Two'] });
    expect(items(el)).toHaveLength(2);

    const header = document.createElement('span');
    header.setAttribute('accordion-header', '');
    const tab = document.createElement('mp-accordion-tab');
    tab.setAttribute('accordion-tab', '');
    el.append(header, tab);
    await flush(el);
    expect(items(el)).toHaveLength(3);
    expect(tab.getAttribute('slot')).toBe('c2');

    el.removeChild(tab);
    el.removeChild(header);
    await flush(el);
    expect(items(el)).toHaveLength(2);
  });

  it('picks up an <mp-accordion-tab> that tags itself on connect', async () => {
    // Children connect AFTER their parent, so the tab is not yet a marker
    // when the accordion first scans — it has to notice the late attribute.
    const el = document.createElement('mp-accordion') as MpAccordion;
    const header = document.createElement('span');
    header.setAttribute('accordion-header', '');
    const tab = document.createElement('mp-accordion-tab');
    el.append(header, tab);
    document.body.appendChild(el);
    await flush(el);
    await flush(el);

    expect(tab.hasAttribute('accordion-tab')).toBe(true);
    expect(items(el)).toHaveLength(1);
    expect(tab.getAttribute('slot')).toBe('c0');
  });

  it('tolerates an accordion with no tabs at all', async () => {
    // The offcanvas nav uses bs-accordion as a bare styled link container.
    const el = document.createElement('mp-accordion') as MpAccordion;
    const link = document.createElement('a');
    link.textContent = 'Just a link';
    el.appendChild(link);
    document.body.appendChild(el);
    await flush(el);

    expect(items(el)).toHaveLength(0);
    const fallback = shadow(el).querySelector('slot:not([name])') as HTMLSlotElement;
    expect(fallback.assignedElements()).toEqual([link]);
  });
});

describe('mp-accordion open/close', () => {
  it('opens a tab on header click and reflects it on the marker', async () => {
    const el = await make();
    buttons(el)[1].click();
    await flush(el);

    expect(markers(el)[1].hasAttribute('is-active')).toBe(true);
    expect(buttons(el)[1].getAttribute('aria-expanded')).toBe('true');
    expect(items(el)[1].classList.contains('open')).toBe(true);
  });

  it('closes the previously open tab when single-open', async () => {
    const el = await make({ active: [0] });
    buttons(el)[2].click();
    await flush(el);

    expect(el.activeIndexes).toEqual([2]);
    expect(markers(el)[0].hasAttribute('is-active')).toBe(false);
  });

  it('keeps siblings open under multi', async () => {
    const el = await make({ attrs: { multi: '' }, active: [0] });
    buttons(el)[2].click();
    await flush(el);

    expect(el.activeIndexes).toEqual([0, 2]);
  });

  it('picks up marker state written from outside (framework two-way binding)', async () => {
    const el = await make();
    markers(el)[1].setAttribute('is-active', '');
    await flush(el);

    expect(el.activeIndexes).toEqual([1]);
    expect(items(el)[1].classList.contains('open')).toBe(true);
  });

  it('ignores interaction with a disabled tab', async () => {
    const el = await make({ disabled: [1] });
    expect(buttons(el)[1].disabled).toBe(true);

    el.open(1);
    await flush(el);
    expect(el.activeIndexes).toEqual([]);
  });

  it('emits one toggle event per tab that actually changed', async () => {
    const el = await make({ active: [0] });
    const seen: AccordionTabToggleDetail[] = [];
    el.addEventListener('mp-accordion-tab-toggle', (event) =>
      seen.push((event as CustomEvent<AccordionTabToggleDetail>).detail));

    buttons(el)[1].click();
    await flush(el);

    expect(seen.map((detail) => [detail.index, detail.active]))
      .toEqual([[0, false], [1, true]]);
    expect(seen[1].originalEvent).toBeInstanceOf(Event);

    // A no-op open must stay silent.
    seen.length = 0;
    el.open(1);
    await flush(el);
    expect(seen).toEqual([]);
  });
});

describe('mp-accordion nested accordions', () => {
  /**
   * PRD §5.3.2 risk gate: closing a tab must collapse every accordion nested
   * inside it, at any depth, so a closed branch can never hide open tabs.
   */
  async function makeNested() {
    const outer = build({ tabs: ['Outer'], active: [0] });
    const middle = build({ tabs: ['Middle'], active: [0] });
    const inner = build({ tabs: ['Inner'], active: [0] });

    // Nest through a wrapper element, as every framework wrapper does.
    const middleHost = document.createElement('bs-accordion');
    middleHost.appendChild(middle);
    const innerHost = document.createElement('bs-accordion');
    innerHost.appendChild(inner);

    middle.querySelector('[accordion-tab]')!.appendChild(innerHost);
    outer.querySelector('[accordion-tab]')!.appendChild(middleHost);

    document.body.appendChild(outer);
    await flush(outer);
    await flush(middle);
    await flush(inner);
    return { outer, middle, inner };
  }

  it('closes accordions nested at every depth inside a closing tab', async () => {
    const { outer, middle, inner } = await makeNested();
    expect([outer.activeIndexes, middle.activeIndexes, inner.activeIndexes])
      .toEqual([[0], [0], [0]]);

    buttons(outer)[0].click();
    await flush(outer);
    await flush(middle);
    await flush(inner);

    expect([outer.activeIndexes, middle.activeIndexes, inner.activeIndexes])
      .toEqual([[], [], []]);
  });

  it('leaves nested accordions alone when a tab OPENS', async () => {
    const { outer, middle } = await makeNested();
    outer.close(0);
    await flush(outer);
    middle.open(0);
    await flush(middle);

    outer.open(0);
    await flush(outer);
    await flush(middle);

    expect(middle.activeIndexes).toEqual([0]);
  });

  it('does not let a nested accordion steal the outer accordion\'s tabs', async () => {
    const { outer, middle } = await makeNested();
    expect(outer.activeIndexes).toEqual([0]);
    // Both have exactly their own single tab — no cross-counting.
    expect(items(outer)).toHaveLength(1);
    expect(items(middle)).toHaveLength(1);
  });
});

describe('mp-accordion accessibility', () => {
  it('exposes the APG accordion structure', async () => {
    const el = await make();
    const headers = [...shadow(el).querySelectorAll('.accordion-header')];
    headers.forEach((header, index) => {
      expect(header.getAttribute('role')).toBe('heading');
      expect(header.getAttribute('aria-level')).toBe('2');
      expect(header.id).toBe(`h${index}`);
    });

    buttons(el).forEach((button, index) => {
      expect(button.getAttribute('aria-controls')).toBe(`c${index}`);
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    [...shadow(el).querySelectorAll('.accordion-collapse')].forEach((region, index) => {
      expect(region.getAttribute('role')).toBe('region');
      expect(region.getAttribute('aria-labelledby')).toBe(`h${index}`);
      expect(region.id).toBe(`c${index}`);
    });
  });

  it('moves focus between headers with the arrow keys, wrapping at both ends', async () => {
    const el = await make();
    const press = (index: number, key: string) =>
      buttons(el)[index].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    buttons(el)[0].focus();
    press(0, 'ArrowDown');
    expect(shadow(el).activeElement).toBe(buttons(el)[1]);

    press(1, 'ArrowUp');
    expect(shadow(el).activeElement).toBe(buttons(el)[0]);

    press(0, 'ArrowUp');
    expect(shadow(el).activeElement).toBe(buttons(el)[2]);

    press(2, 'Home');
    expect(shadow(el).activeElement).toBe(buttons(el)[0]);

    press(0, 'End');
    expect(shadow(el).activeElement).toBe(buttons(el)[2]);
  });

  it('leaves other keys to the browser', async () => {
    const el = await make();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    buttons(el)[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('mp-accordion SSR handoff', () => {
  it('renders tab-count rows when there is no light DOM to measure', async () => {
    // Exactly what the chrome generator renders it with. Under lit-ssr there
    // is no connectedCallback (hence no data-js) and the no-JS input machine
    // is emitted; here the element is live, so the rows carry buttons — the
    // count-driven row rendering the generator depends on is the same.
    const el = document.createElement('mp-accordion') as MpAccordion;
    el.setAttribute('tab-count', '3');
    document.body.appendChild(el);
    await flush(el);

    expect(items(el)).toHaveLength(3);
    expect(buttons(el)).toHaveLength(3);
  });

  it('adopts the pre-upgrade checked state from server-rendered chrome', async () => {
    const el = build({ active: [] });
    // Stand in for the DSD the SSR injector spliced in: tab 1 was left open.
    const template = document.createElement('template');
    template.innerHTML = `
      <div class="accordion-root">
        <div class="accordion-item"><input class="acc-input" type="radio" id="t0"></div>
        <div class="accordion-item"><input class="acc-input" type="radio" id="t1" checked></div>
        <div class="accordion-item"><input class="acc-input" type="radio" id="t2"></div>
      </div>`;
    el.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

    document.body.appendChild(el);
    await flush(el);

    expect(el.activeIndexes).toEqual([1]);
    // …and the server chrome is gone, replaced by a clean client render.
    expect(shadow(el).querySelectorAll('.acc-input')).toHaveLength(0);
    expect(items(el)).toHaveLength(3);
  });

  it('sets data-js so the no-JS stylesheet disengages', async () => {
    const el = await make();
    expect(el.hasAttribute('data-js')).toBe(true);
  });
});

describe('mp-accordion configuration', () => {
  it('keeps multi and highlight-active-tab attribute-only', async () => {
    // @lit/react drops props that match a prototype accessor from the
    // server-rendered HTML, which would silently change the SSR chrome.
    expect('multi' in MpAccordion.prototype).toBe(false);
    expect('highlightActiveTab' in MpAccordion.prototype).toBe(false);
    const el = await make({ attrs: { multi: '' } });
    expect(el.hasAttribute('multi')).toBe(true);
  });

  it('re-renders when multi is toggled at runtime', async () => {
    const el = await make({ attrs: { multi: '' }, active: [0, 1] });
    expect(el.activeIndexes).toEqual([0, 1]);

    el.removeAttribute('multi');
    await flush(el);
    buttons(el)[2].click();
    await flush(el);

    expect(el.activeIndexes).toEqual([2]);
  });

  it('closeAll collapses everything and reports each change', async () => {
    const el = await make({ attrs: { multi: '' }, active: [0, 2] });
    const seen = vi.fn();
    el.addEventListener('mp-accordion-tab-toggle', seen);

    el.closeAll();
    await flush(el);

    expect(el.activeIndexes).toEqual([]);
    expect(seen).toHaveBeenCalledTimes(2);
  });
});
