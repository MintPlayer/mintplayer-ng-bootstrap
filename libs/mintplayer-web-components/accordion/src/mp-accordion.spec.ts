import { afterEach, describe, expect, it } from 'vitest';
import { MpAccordion, MpAccordionTab } from './index';

void MpAccordion; // force the side-effect registrations
void MpAccordionTab;

/**
 * The generated Lit accordion (#458 M4): light DOM, native `<details>` rows
 * inside `mp-accordion-tab` hosts, `slot="header"` content in the summary.
 */
type Lit = HTMLElement & { updateComplete: Promise<unknown> };

async function settle(): Promise<void> {
  const elements = [...document.body.querySelectorAll<Lit>('mp-accordion, mp-accordion-tab')];
  await Promise.all(elements.map((el) => el.updateComplete));
  await Promise.all(elements.map((el) => el.updateComplete));
}

/**
 * Mounts and lets the render's own `toggle` events (a tab rendered open fires
 * one, a task later) arrive before the test acts, as they would before any
 * user could click. Acting earlier lets that late toggle enforce single-open
 * over the test's change (jsdom has no native `<details name>` exclusivity).
 */
async function mount(html: string): Promise<void> {
  document.body.innerHTML = html;
  await settle();
  await new Promise((resolve) => setTimeout(resolve));
  await settle();
}

const TABS = ['One', 'Two', 'Three']
  .map((title) => `<mp-accordion-tab><span slot="header">${title}</span><span class="body">${title} body</span></mp-accordion-tab>`)
  .join('');

const rows = (root: Element = document.querySelector('mp-accordion')!) =>
  [...root.querySelectorAll<HTMLDetailsElement>(':scope > mp-accordion-tab > details')];

const flip = async (row: HTMLDetailsElement, open: boolean) => {
  const toggled = new Promise((resolve) => row.addEventListener('toggle', resolve, { once: true }));
  row.open = open;
  await toggled;
  await settle();
};

describe('mp-accordion / mp-accordion-tab', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders Bootstrap accordion markup in the light DOM', async () => {
    await mount(`<mp-accordion>${TABS}</mp-accordion>`);
    const el = document.querySelector('mp-accordion') as MpAccordion;
    expect(el.shadowRoot).toBeNull();
    expect(el.classList.contains('accordion')).toBe(true);
    expect(el.getAttribute('data-mps')).toBe('accordion');
    expect(rows()).toHaveLength(3);
    const [row] = rows();
    expect(row.querySelector('summary')?.textContent?.trim()).toBe('One');
    expect(row.querySelector('.accordion-content .body')?.textContent).toBe('One body');
    const summary = row.querySelector('summary')!;
    const region = row.querySelector('[role=region]')!;
    expect(summary.getAttribute('aria-controls')).toBe(region.id);
    expect(region.getAttribute('aria-labelledby')).toBe(summary.id);
  });

  it('names the rows for single-open only', async () => {
    await mount(`<mp-accordion>${TABS}</mp-accordion><mp-accordion multi>${TABS}</mp-accordion>`);
    const [single, multi] = [...document.querySelectorAll('mp-accordion')];
    expect(new Set(rows(single).map((row) => row.getAttribute('name'))).size).toBe(1);
    expect(rows(single)[0].getAttribute('name')).toBeTruthy();
    expect(rows(multi).some((row) => row.hasAttribute('name'))).toBe(false);
  });

  it('opens a tab from its open attribute and reflects a toggle back', async () => {
    await mount(`<mp-accordion><mp-accordion-tab open><span slot="header">A</span>a</mp-accordion-tab>${TABS}</mp-accordion>`);
    const tabs = [...document.querySelectorAll<MpAccordionTab>('mp-accordion-tab')];
    expect(rows()[0].open).toBe(true);

    const seen: unknown[] = [];
    document.querySelector('mp-accordion')!.addEventListener('tabtoggle', (e) => seen.push((e as CustomEvent).detail));
    const closed = new Promise((resolve) => rows()[0].addEventListener('toggle', resolve, { once: true }));
    await flip(rows()[2], true);
    await closed;
    await settle();
    expect(rows().map((row) => row.open)).toEqual([false, false, true, false]);
    expect(tabs[2].open).toBe(true);
    expect(tabs[0].open).toBe(false);
    expect(seen).toContainEqual({ index: 2, active: true });
  });

  it('closes nested accordions with their row', async () => {
    await mount(`<mp-accordion><mp-accordion-tab open><span slot="header">Outer</span><mp-accordion>${TABS}</mp-accordion></mp-accordion-tab></mp-accordion>`);
    const inner = document.querySelectorAll('mp-accordion')[1];
    await flip(rows(inner)[1], true);
    await flip(rows()[0], false);
    expect(rows(inner).some((row) => row.open)).toBe(false);
  });
});
