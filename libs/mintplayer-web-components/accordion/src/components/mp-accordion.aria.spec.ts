import { afterEach, describe, expect, it } from 'vitest';
import { MpAccordion } from './mp-accordion';
import { MpAccordionTab } from './mp-accordion-tab';

void MpAccordion; // force the side-effect registration
void MpAccordionTab;

/**
 * ARIA gaps beyond `mp-accordion.spec.ts`, which asserts the first-render
 * wiring (summary id ↔ `aria-controls` ↔ region `aria-labelledby`) and the
 * absence of `role="heading"`/`aria-expanded`.
 *
 * What this file adds: the naming channel (nothing is invented, nothing is
 * copied inward), the `aria-disabled` state transition in BOTH directions from
 * a programmatic marker write, the UA-owned disclosure state re-asserted after
 * programmatic open/close, and IDREF integrity as tabs come and go or
 * accordions nest — every row reuses the strings `h0`/`c0`, so correctness
 * depends entirely on each accordion owning its own shadow root.
 */

async function flush(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function settle(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await flush(el);
  await new Promise((resolve) => setTimeout(resolve, 20));
  await flush(el);
}

interface MakeOptions {
  attrs?: Record<string, string>;
  tabs?: string[];
  active?: number[];
  disabled?: number[];
}

function build({ attrs = {}, tabs = ['One', 'Two', 'Three'], active = [], disabled = [] }: MakeOptions = {}): MpAccordion {
  const el = document.createElement('mp-accordion') as MpAccordion;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  const children = tabs.flatMap((label, index) => {
    const header = document.createElement('span');
    header.setAttribute('accordion-header', '');
    header.textContent = label;

    const tab = document.createElement('mp-accordion-tab');
    tab.setAttribute('accordion-tab', '');
    tab.textContent = `${label} body`;
    if (active.includes(index)) tab.setAttribute('is-active', '');
    if (disabled.includes(index)) tab.setAttribute('disabled', '');
    return [header, tab];
  });
  el.append(...children);
  return el;
}

async function make(options: MakeOptions = {}): Promise<MpAccordion> {
  const el = build(options);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

/** Append one header+tab pair, as a framework wrapper adding a tab would. */
function appendTab(el: MpAccordion, label: string): HTMLElement {
  const header = document.createElement('span');
  header.setAttribute('accordion-header', '');
  header.textContent = label;
  const tab = document.createElement('mp-accordion-tab');
  tab.setAttribute('accordion-tab', '');
  el.append(header, tab);
  return tab;
}

const shadow = (el: MpAccordion) => el.shadowRoot!;
const summaries = (el: MpAccordion) => [...shadow(el).querySelectorAll<HTMLElement>('summary.accordion-button')];
const items = (el: MpAccordion) => [...shadow(el).querySelectorAll<HTMLDetailsElement>('details.accordion-item')];
const markers = (el: MpAccordion) => [...el.querySelectorAll<HTMLElement>('[accordion-tab]')];

/** The node a summary's aria-controls points at, looked up in its own root. */
function controlledRegion(el: MpAccordion, index: number): Element | null {
  const id = summaries(el)[index].getAttribute('aria-controls');
  return id ? shadow(el).querySelector(`#${id}`) : null;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-accordion naming channel', () => {
  it('invents no aria-label on the summary — the slotted header names it natively', async () => {
    const el = await make({ tabs: ['Profile'] });
    const summary = summaries(el)[0];
    expect(summary.hasAttribute('aria-label')).toBe(false);
    expect(summary.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('never copies host aria-labelledby / aria-describedby inward as IDREF strings', async () => {
    // Those IDREFs resolve in the document, not in this shadow root; copying
    // them in would point at nothing.
    const outside = document.createElement('span');
    outside.id = 'outer-label';
    outside.textContent = 'Settings';
    document.body.appendChild(outside);

    const el = await make({ tabs: ['One', 'Two'] });
    el.setAttribute('aria-labelledby', 'outer-label');
    el.setAttribute('aria-describedby', 'outer-label');
    await settle(el);

    expect([...shadow(el).querySelectorAll('[aria-labelledby]')].every(
      (node) => node.getAttribute('aria-labelledby')!.startsWith('h'),
    )).toBe(true);
    expect(shadow(el).querySelector('[aria-describedby]')).toBeNull();
  });

  it('does not mirror a host aria-label onto the rows, which would make every header read alike', async () => {
    const el = await make({ attrs: { 'aria-label': 'Account settings' }, tabs: ['One', 'Two'] });
    expect(summaries(el).some((summary) => summary.hasAttribute('aria-label'))).toBe(false);
    expect([...shadow(el).querySelectorAll('.accordion-content')]
      .some((region) => region.hasAttribute('aria-label'))).toBe(false);
  });
});

describe('mp-accordion aria-disabled transitions', () => {
  it('omits aria-disabled entirely on an enabled tab (absent, not "false")', async () => {
    const el = await make({ tabs: ['One'] });
    const summary = summaries(el)[0];
    expect(summary.hasAttribute('aria-disabled')).toBe(false);
    expect(summary.hasAttribute('tabindex')).toBe(false);
  });

  it('follows a runtime disable and re-enable of the marker in both directions', async () => {
    const el = await make({ tabs: ['One', 'Two'] });
    const marker = markers(el)[1];

    marker.setAttribute('disabled', '');
    await settle(el);
    expect(summaries(el)[1].getAttribute('aria-disabled')).toBe('true');
    expect(summaries(el)[1].getAttribute('tabindex')).toBe('-1');
    // Sibling untouched — the state is per row, not per accordion.
    expect(summaries(el)[0].hasAttribute('aria-disabled')).toBe(false);

    marker.removeAttribute('disabled');
    await settle(el);
    expect(summaries(el)[1].hasAttribute('aria-disabled')).toBe(false);
    expect(summaries(el)[1].hasAttribute('tabindex')).toBe(false);
  });

  it('drops the keydown guard together with aria-disabled, so the two never disagree', async () => {
    const el = await make({ tabs: ['One'], disabled: [0] });
    const blocked = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    summaries(el)[0].dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);

    markers(el)[0].removeAttribute('disabled');
    await settle(el);

    const allowed = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    summaries(el)[0].dispatchEvent(allowed);
    expect(allowed.defaultPrevented).toBe(false);
    expect(summaries(el)[0].hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('mp-accordion disclosure state', () => {
  it('re-asserts the UA-owned open state after each programmatic write (closed → open → closed)', async () => {
    const el = await make({ tabs: ['One', 'Two'] });
    expect(items(el)[0].open).toBe(false);
    expect(items(el)[0].hasAttribute('open')).toBe(false);

    el.open(0);
    await settle(el);
    expect(items(el)[0].open).toBe(true);
    expect(items(el)[0].hasAttribute('open')).toBe(true);
    expect(markers(el)[0].hasAttribute('is-active')).toBe(true);

    el.close(0);
    await settle(el);
    expect(items(el)[0].open).toBe(false);
    expect(items(el)[0].hasAttribute('open')).toBe(false);
    expect(markers(el)[0].hasAttribute('is-active')).toBe(false);

    el.toggle(0);
    await settle(el);
    expect(items(el)[0].open).toBe(true);
  });

  it('leaves no row with a stale open attribute after closeAll', async () => {
    const el = await make({ attrs: { multi: '' }, active: [0, 2] });
    el.closeAll();
    await settle(el);
    expect(items(el).map((item) => item.hasAttribute('open'))).toEqual([false, false, false]);
  });
});

describe('mp-accordion IDREF integrity', () => {
  it('keeps every summary → region pair resolvable and unique', async () => {
    const el = await make();
    const ids = summaries(el).map((summary) => summary.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(items(el).map((_, index) => controlledRegion(el, index)?.getAttribute('role')))
      .toEqual(['region', 'region', 'region']);
  });

  it('re-wires the pair for a tab appended at runtime', async () => {
    const el = await make({ tabs: ['One', 'Two'] });
    appendTab(el, 'Three');
    await settle(el);

    expect(summaries(el)).toHaveLength(3);
    expect(summaries(el)[2].id).toBe('h2');
    expect(summaries(el)[2].getAttribute('aria-controls')).toBe('c2');
    expect(controlledRegion(el, 2)?.getAttribute('aria-labelledby')).toBe('h2');
  });

  it('leaves no dangling aria-controls after a tab is removed', async () => {
    const el = await make();
    // Children alternate header, tab — drop the third pair.
    const children = [...el.children];
    el.removeChild(children[5]);
    el.removeChild(children[4]);
    await settle(el);

    expect(summaries(el)).toHaveLength(2);
    expect(summaries(el).map((_, index) => controlledRegion(el, index) !== null)).toEqual([true, true]);
    expect(shadow(el).querySelector('#c2')).toBeNull();
  });

  it('resolves the reused h0 / c0 IDREFs inside each accordion\'s OWN shadow root when nested', async () => {
    const outer = build({ tabs: ['Outer'], active: [0] });
    const inner = build({ tabs: ['Inner'], active: [0] });
    const innerHost = document.createElement('bs-accordion');
    innerHost.appendChild(inner);
    outer.querySelector('[accordion-tab]')!.appendChild(innerHost);
    document.body.appendChild(outer);
    await flush(outer);
    await flush(inner);

    // Same strings in both roots; an IDREF is scoped to its own tree, so each
    // summary must land on the region of its own accordion.
    expect(summaries(outer)[0].getAttribute('aria-controls')).toBe('c0');
    expect(summaries(inner)[0].getAttribute('aria-controls')).toBe('c0');
    expect(controlledRegion(outer, 0)!.getRootNode()).toBe(shadow(outer));
    expect(controlledRegion(inner, 0)!.getRootNode()).toBe(shadow(inner));
    expect(controlledRegion(outer, 0)).not.toBe(controlledRegion(inner, 0));
  });

  it('wires the same region semantics on tab-count-only rows (the SSR chrome shape)', async () => {
    const el = document.createElement('mp-accordion') as MpAccordion;
    el.setAttribute('tab-count', '2');
    document.body.appendChild(el);
    await flush(el);

    expect(summaries(el).map((summary) => summary.getAttribute('aria-controls'))).toEqual(['c0', 'c1']);
    expect(summaries(el).map((_, index) => controlledRegion(el, index)?.getAttribute('aria-labelledby')))
      .toEqual(['h0', 'h1']);
    // No light DOM means no marker can be disabled — so no row may claim it is.
    expect(summaries(el).some((summary) => summary.hasAttribute('aria-disabled'))).toBe(false);
  });
});
