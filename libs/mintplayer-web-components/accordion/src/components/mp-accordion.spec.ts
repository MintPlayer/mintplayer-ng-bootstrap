import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpAccordion, type AccordionTabToggleDetail } from './mp-accordion';
import { MpAccordionTab } from './mp-accordion-tab';

void MpAccordion; // force the side-effect registration
void MpAccordionTab;

/**
 * D1 contract: the accordion is built on `<details name>`/`<summary>` in BOTH
 * tiers. Spike 0.1a's rules shape every assertion here:
 *  - `toggle` is async and coalesced — never count toggle events; poll for
 *    presence, settle for absence, and treat `details.open` as authoritative.
 *  - jsdom implements summary activation and toggle, but NOT `name`
 *    exclusivity — single-open below is asserted against the element's own
 *    enforcement, which real browsers duplicate (harmlessly) via the UA.
 */

async function flush(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

/** toggle is queued by the UA; give the task queue a beat, then re-render. */
async function settle(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await flush(el);
  await new Promise((resolve) => setTimeout(resolve, 20));
  await flush(el);
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
const summaries = (el: MpAccordion) => [...shadow(el).querySelectorAll<HTMLElement>('summary.accordion-button')];
const items = (el: MpAccordion) => [...shadow(el).querySelectorAll<HTMLDetailsElement>('details.accordion-item')];
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

  it('renders the row as details > summary + content — no clip machinery, no inputs', async () => {
    const el = await make({ tabs: ['One'] });
    const item = items(el)[0];
    expect(item.tagName).toBe('DETAILS');
    expect(item.querySelector('summary.accordion-button')).toBeTruthy();

    const content = item.querySelector('.accordion-content');
    expect(content).toBeTruthy();
    expect(content!.getAttribute('part')).toBe('content');
    expect(content!.querySelector('slot')?.getAttribute('name')).toBe('c0');

    // The pre-D1 machinery must be gone entirely.
    expect(shadow(el).querySelector('.acc-input')).toBeNull();
    expect(shadow(el).querySelector('.accordion-collapse')).toBeNull();
    expect(shadow(el).querySelector('.accordion-clip')).toBeNull();
    expect(shadow(el).querySelector('button')).toBeNull();
  });

  it('flags a nested accordion so its doubled border can collapse', async () => {
    const { outer, inner } = await (async () => {
      const outer = build({ tabs: ['Outer'], active: [0] });
      const inner = build({ tabs: ['Inner'] });
      const host = document.createElement('bs-accordion');
      host.appendChild(inner);
      outer.querySelector('[accordion-tab]')!.appendChild(host);
      document.body.appendChild(outer);
      await flush(outer);
      await flush(inner);
      return { outer, inner };
    })();

    expect(inner.hasAttribute('data-nested')).toBe(true);
    expect(outer.hasAttribute('data-nested')).toBe(false);
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
  it('opens a tab on summary activation and reflects it on the marker', async () => {
    const el = await make();
    summaries(el)[1].click();
    await settle(el);

    expect(markers(el)[1].hasAttribute('is-active')).toBe(true);
    expect(items(el)[1].open).toBe(true);
  });

  it('closes the previously open tab when single-open (element-enforced — jsdom has no name exclusivity)', async () => {
    const el = await make({ active: [0] });
    summaries(el)[2].click();
    await settle(el);

    expect(el.activeIndexes).toEqual([2]);
    expect(markers(el)[0].hasAttribute('is-active')).toBe(false);
    expect(items(el)[0].open).toBe(false);
  });

  it('keeps siblings open under multi', async () => {
    const el = await make({ attrs: { multi: '' }, active: [0] });
    summaries(el)[2].click();
    await settle(el);

    expect(el.activeIndexes).toEqual([0, 2]);
  });

  it('single-open renders a name group; multi renders none', async () => {
    const single = await make();
    items(single).forEach((d) => expect(d.getAttribute('name')).toBe('acc'));

    const multi = await make({ attrs: { multi: '' } });
    items(multi).forEach((d) => expect(d.hasAttribute('name')).toBe(false));
  });

  it('picks up marker state written from outside (framework two-way binding)', async () => {
    const el = await make();
    markers(el)[1].setAttribute('is-active', '');
    await settle(el);

    expect(el.activeIndexes).toEqual([1]);
    expect(items(el)[1].open).toBe(true);
  });

  it('ignores interaction with a disabled tab', async () => {
    const el = await make({ disabled: [1] });
    const summary = summaries(el)[1];
    expect(summary.getAttribute('aria-disabled')).toBe('true');
    expect(summary.getAttribute('tabindex')).toBe('-1');

    // The cancellable keydown guard is what keeps a disabled tab inert —
    // toggle itself is not cancellable (spike 0.1a).
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    summary.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);

    el.open(1);
    await settle(el);
    expect(el.activeIndexes).toEqual([]);
  });

  it('emits one toggle event per tab that actually changed', async () => {
    const el = await make({ active: [0] });
    const seen: AccordionTabToggleDetail[] = [];
    el.addEventListener('mp-accordion-tab-toggle', (event) =>
      seen.push((event as CustomEvent<AccordionTabToggleDetail>).detail));

    summaries(el)[1].click();
    await settle(el);

    expect(seen.map((detail) => [detail.index, detail.active]).sort())
      .toEqual([[0, false], [1, true]].sort());
    expect(seen.every((detail) => detail.originalEvent instanceof Event)).toBe(true);

    // A no-op open must stay silent (absence: settle window, not a race).
    seen.length = 0;
    el.open(1);
    await settle(el);
    expect(seen).toEqual([]);
  });

  it('a UA-driven open arriving only via the toggle event still syncs state', async () => {
    // What happens in real browsers when `name` exclusivity closes a sibling,
    // and in any engine when something else flips `open` directly.
    const el = await make();
    items(el)[2].open = true;
    await settle(el);

    expect(el.activeIndexes).toEqual([2]);
    expect(markers(el)[2].hasAttribute('is-active')).toBe(true);
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

    summaries(outer)[0].click();
    await settle(outer);
    await settle(middle);
    await settle(inner);

    expect([outer.activeIndexes, middle.activeIndexes, inner.activeIndexes])
      .toEqual([[], [], []]);
  });

  it('leaves nested accordions alone when a tab OPENS', async () => {
    const { outer, middle } = await makeNested();
    outer.close(0);
    await settle(outer);
    middle.open(0);
    await settle(middle);

    outer.open(0);
    await settle(outer);
    await settle(middle);

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
  it('exposes native disclosure structure: summary controls a labelled region', async () => {
    const el = await make();
    summaries(el).forEach((summary, index) => {
      expect(summary.id).toBe(`h${index}`);
      expect(summary.getAttribute('aria-controls')).toBe(`c${index}`);
    });
    [...shadow(el).querySelectorAll('.accordion-content')].forEach((region, index) => {
      expect(region.getAttribute('role')).toBe('region');
      expect(region.getAttribute('aria-labelledby')).toBe(`h${index}`);
      expect(region.id).toBe(`c${index}`);
    });
    // The D1 trade, asserted so it is a decision rather than an accident:
    // headers are no longer headings (details/summary owns expand/collapse
    // semantics natively; aria-expanded on a summary is redundant).
    expect(shadow(el).querySelector('[role="heading"]')).toBeNull();
    expect(shadow(el).querySelector('[aria-expanded]')).toBeNull();
  });

  it('moves focus between headers with the arrow keys, wrapping at both ends', async () => {
    const el = await make();
    const press = (index: number, key: string) =>
      summaries(el)[index].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    summaries(el)[0].focus();
    press(0, 'ArrowDown');
    expect(shadow(el).activeElement).toBe(summaries(el)[1]);

    press(1, 'ArrowUp');
    expect(shadow(el).activeElement).toBe(summaries(el)[0]);

    press(0, 'ArrowUp');
    expect(shadow(el).activeElement).toBe(summaries(el)[2]);

    press(2, 'Home');
    expect(shadow(el).activeElement).toBe(summaries(el)[0]);

    press(0, 'End');
    expect(shadow(el).activeElement).toBe(summaries(el)[2]);
  });

  it('leaves other keys to the browser', async () => {
    const el = await make();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    summaries(el)[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('mp-accordion SSR handoff', () => {
  it('renders tab-count rows when there is no light DOM to measure', async () => {
    const el = document.createElement('mp-accordion') as MpAccordion;
    el.setAttribute('tab-count', '3');
    document.body.appendChild(el);
    await flush(el);

    expect(items(el)).toHaveLength(3);
    expect(summaries(el)).toHaveLength(3);
  });

  it('adopts the pre-upgrade open state from server-rendered chrome', async () => {
    const el = build({ active: [] });
    // Stand in for the DSD the SSR injector spliced in: tab 1 was left open
    // by the user before hydration (details carries UA-owned state).
    const template = document.createElement('template');
    template.innerHTML = `
      <div class="accordion-root">
        <details class="accordion-item" name="acc"><summary class="accordion-button">a</summary></details>
        <details class="accordion-item" name="acc" open><summary class="accordion-button">b</summary></details>
        <details class="accordion-item" name="acc"><summary class="accordion-button">c</summary></details>
      </div>`;
    el.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

    document.body.appendChild(el);
    await flush(el);

    expect(el.activeIndexes).toEqual([1]);
    // …and the server chrome is replaced by a clean client render.
    expect(items(el)).toHaveLength(3);
    expect(items(el)[1].open).toBe(true);
  });

  it('sets data-js as the observable hydration marker', async () => {
    // No styling hangs off it since D1; e2e readiness predicates key on it
    // (lit-ssr never runs connectedCallback, so the DSD chrome lacks it).
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
    await settle(el);
    summaries(el)[2].click();
    await settle(el);

    expect(el.activeIndexes).toEqual([2]);
  });

  it('closeAll collapses everything and reports each change', async () => {
    const el = await make({ attrs: { multi: '' }, active: [0, 2] });
    const seen = vi.fn();
    el.addEventListener('mp-accordion-tab-toggle', seen);

    el.closeAll();
    await settle(el);

    expect(el.activeIndexes).toEqual([]);
    expect(seen).toHaveBeenCalledTimes(2);
  });
});
