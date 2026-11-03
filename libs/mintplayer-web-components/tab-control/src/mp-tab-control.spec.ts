import { afterEach, describe, expect, it } from 'vitest';
import { MpTabControl, MpTabPage } from './index';

void MpTabControl; // force the side-effect registrations
void MpTabPage;

/**
 * The generated Lit tab control (#458 M4): light DOM; each `mp-tab-page` is a
 * declaration whose `slot="header"` children move into the tab's label and
 * whose other children move into the pane (Q15).
 */
type Lit = HTMLElement & { updateComplete: Promise<unknown> };

async function settle(): Promise<void> {
  for (let pass = 0; pass < 3; pass++) {
    const elements = [...document.body.querySelectorAll<Lit>('mp-tab-control, mp-tab-page')];
    await Promise.all(elements.map((el) => el.updateComplete));
  }
}

async function mount(html: string): Promise<void> {
  document.body.innerHTML = html;
  await settle();
}

const PAGES = [
  `<mp-tab-page tab-id="one"><strong slot="header" class="rich">One</strong><span class="body">One body</span></mp-tab-page>`,
  `<mp-tab-page tab-id="two"><strong slot="header" class="rich">Two</strong><span class="body">Two body</span></mp-tab-page>`,
  `<mp-tab-page tab-id="three" disabled><strong slot="header" class="rich">Three</strong><span class="body">Three body</span></mp-tab-page>`,
].join('');

const outer = () => document.querySelector('mp-tab-control') as MpTabControl;
const tabs = (root: Element = outer()) => [...root.querySelectorAll<HTMLLabelElement>(':scope > .tsc > ul > li > label.nav-link')];
const panes = (root: Element = outer()) => [...root.querySelectorAll<HTMLElement>(':scope > .tab-content > .tab-pane')];
const selected = (root: Element = outer()) => tabs(root).map((tab) => tab.getAttribute('aria-selected'));

describe('mp-tab-control / mp-tab-page', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the nav-tabs markup in the light DOM, the pages hidden', async () => {
    await mount(`<mp-tab-control>${PAGES}</mp-tab-control>`);
    expect(outer().shadowRoot).toBeNull();
    expect(outer().classList.contains('tab-control')).toBe(true);
    expect(outer().getAttribute('data-mps')).toBe('tab-control');
    expect(outer().querySelectorAll(':scope > input.tab-radio')).toHaveLength(3);
    expect(tabs()).toHaveLength(3);
    expect([...outer().querySelectorAll<HTMLElement>('mp-tab-page')].every((page) => page.hidden)).toBe(true);
  });

  it('moves each rich header into its tab and each body into its pane', async () => {
    await mount(`<mp-tab-control>${PAGES}</mp-tab-control>`);
    expect(tabs().map((tab) => tab.querySelector('strong.rich')?.textContent)).toEqual(['One', 'Two', 'Three']);
    expect(panes().map((pane) => pane.querySelector('.body')?.textContent)).toEqual(['One body', 'Two body', 'Three body']);
    tabs().forEach((tab, index) => expect(tab.getAttribute('aria-controls')).toBe(panes()[index].id));
  });

  it('selects on click, reports the page id and skips a disabled page', async () => {
    await mount(`<mp-tab-control>${PAGES}</mp-tab-control>`);
    const changes: unknown[] = [];
    outer().addEventListener('activetabchange', (event) => changes.push((event as CustomEvent).detail));
    expect(selected()).toEqual(['true', 'false', 'false']);

    tabs()[1].click();
    await settle();
    expect(selected()).toEqual(['false', 'true', 'false']);
    expect(outer().activeTab).toBe('two');
    expect(changes).toEqual(['two']);

    tabs()[2].click();
    await settle();
    expect(outer().activeTab).toBe('two');
  });

  it('moves with the arrow keys, skipping disabled pages', async () => {
    await mount(`<mp-tab-control>${PAGES}</mp-tab-control>`);
    tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await settle();
    expect(selected()).toEqual(['false', 'true', 'false']);
    tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await settle();
    expect(selected()).toEqual(['true', 'false', 'false']);
  });

  it('keeps a nested control\'s pages out of the outer one', async () => {
    await mount(`<mp-tab-control>
      <mp-tab-page><span slot="header">Outer</span>
        <mp-tab-control class="inner">
          <mp-tab-page><span slot="header">Inner A</span>A</mp-tab-page>
          <mp-tab-page><span slot="header">Inner B</span>B</mp-tab-page>
        </mp-tab-control>
      </mp-tab-page>
    </mp-tab-control>`);
    const inner = document.querySelector('mp-tab-control.inner')!;
    expect(tabs()).toHaveLength(1);
    expect(tabs(inner).map((tab) => tab.textContent?.trim())).toEqual(['Inner A', 'Inner B']);
    expect(panes()[0].contains(inner)).toBe(true);
  });
});
