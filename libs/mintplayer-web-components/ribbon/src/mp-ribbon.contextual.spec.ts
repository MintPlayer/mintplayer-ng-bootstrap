import { afterEach, describe, expect, it } from 'vitest';

import './mp-ribbon.element';
import './mp-ribbon-tab.element';
import './mp-ribbon-contextual-tab-set.element';

import type { MpRibbon } from './mp-ribbon.element';
import type { MpRibbonContextualTabSet } from './mp-ribbon-contextual-tab-set.element';

/**
 * Contextual tab sets: the coloured band in the tab strip, its text-contrast
 * rule, and show/hide re-processing with its announcement.
 */

const mounted: HTMLElement[] = [];

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function mount(markup: string): Promise<MpRibbon> {
  const container = document.createElement('div');
  container.innerHTML = markup;
  document.body.appendChild(container);
  mounted.push(container);
  const ribbon = container.querySelector('mp-ribbon') as MpRibbon;
  await ribbon.updateComplete;
  await settle();
  await ribbon.updateComplete;
  return ribbon;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

const band = (ribbon: MpRibbon) =>
  ribbon.shadowRoot!.querySelector<HTMLElement>('.ribbon-contextual-group');

const tabLabels = (ribbon: MpRibbon) =>
  [...ribbon.shadowRoot!.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim());

const live = (ribbon: MpRibbon) =>
  ribbon.shadowRoot!.querySelector('[aria-live]')!.textContent?.trim();

async function ribbonWithSet(color: string): Promise<MpRibbon> {
  return mount(`
    <mp-ribbon>
      <mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab>
      <mp-ribbon-contextual-tab-set label="Picture Tools" color="${color}">
        <mp-ribbon-tab tab-id="format" label="Format"></mp-ribbon-tab>
        <mp-ribbon-tab tab-id="crop" label="Crop"></mp-ribbon-tab>
      </mp-ribbon-contextual-tab-set>
    </mp-ribbon>`);
}

describe('mp-ribbon — contextual tab set band', () => {
  it('groups the set\'s tabs under one band carrying the set label and colour', async () => {
    const ribbon = await ribbonWithSet('#5BAEFF');
    const group = band(ribbon)!;
    expect(group.querySelector('.ribbon-contextual-group-band')!.textContent).toBe('Picture Tools');
    const inner = [...group.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim());
    expect(inner).toEqual(['Format', 'Crop']);
    expect(group.getAttribute('style')).toContain('--bs-ribbon-contextual-color: #5BAEFF');
    expect(tabLabels(ribbon)).toEqual(['Home', 'Format', 'Crop']);
    // The set's tabs are contextual; the plain one is not.
    const tabs = [...ribbon.shadowRoot!.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.classList.contains('contextual'))).toEqual([false, true, true]);
  });

  it.each([
    ['a pastel 6-digit hex', '#FFE699', '#262626'],
    ['a saturated 6-digit hex', '#1F4E79', '#FFFFFF'],
    ['a dark 3-digit hex', '#000', '#FFFFFF'],
    ['a light 3-digit hex', '#fff', '#262626'],
    ['a dark 8-digit hex with alpha', '#000000ff', '#FFFFFF'],
    ['a dark 4-digit hex with alpha', '#008f', '#FFFFFF'],
    ['a non-hex colour (safe dark default)', 'rebeccapurple', '#262626'],
  ])('picks the band text colour for %s', async (_what, color, expected) => {
    const ribbon = await ribbonWithSet(color);
    expect(band(ribbon)!.getAttribute('style')).toContain(`--ribbon-contextual-text: ${expected}`);
  });

  it('finds a set nested inside a wrapper element (Angular host shape)', async () => {
    const ribbon = await mount(`
      <mp-ribbon>
        <div><mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab></div>
        <div>
          <mp-ribbon-contextual-tab-set label="Table" color="#1F4E79">
            <mp-ribbon-tab tab-id="design" label="Design"></mp-ribbon-tab>
          </mp-ribbon-contextual-tab-set>
        </div>
      </mp-ribbon>`);
    expect(tabLabels(ribbon)).toEqual(['Home', 'Design']);
    expect(band(ribbon)).not.toBeNull();
  });

  it('leaves a set with no tabs out of the strip', async () => {
    const ribbon = await mount(`
      <mp-ribbon>
        <mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab>
        <mp-ribbon-contextual-tab-set label="Empty" color="#1F4E79"></mp-ribbon-contextual-tab-set>
      </mp-ribbon>`);
    expect(tabLabels(ribbon)).toEqual(['Home']);
    expect(band(ribbon)).toBeNull();
  });
});

describe('mp-ribbon — contextual visibility', () => {
  async function hiddenSetRibbon(): Promise<{ ribbon: MpRibbon; set: MpRibbonContextualTabSet }> {
    const ribbon = await mount(`
      <mp-ribbon>
        <mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab>
        <mp-ribbon-contextual-tab-set label="Picture Tools" color="#1F4E79" hidden>
          <mp-ribbon-tab tab-id="format" label="Format"></mp-ribbon-tab>
        </mp-ribbon-contextual-tab-set>
      </mp-ribbon>`);
    const set = ribbon.querySelector('mp-ribbon-contextual-tab-set') as MpRibbonContextualTabSet;
    return { ribbon, set };
  }

  it('omits a hidden set\'s tabs from the strip', async () => {
    const { ribbon } = await hiddenSetRibbon();
    expect(tabLabels(ribbon)).toEqual(['Home']);
  });

  it('adds the tabs back and announces the set when it is shown', async () => {
    const { ribbon, set } = await hiddenSetRibbon();
    set.hidden = false;
    await set.updateComplete;
    await ribbon.updateComplete;
    expect(tabLabels(ribbon)).toEqual(['Home', 'Format']);
    expect(live(ribbon)).toBe('Picture Tools, contextual, now available');
  });

  it('announces hiding, and moves the active tab off a tab that vanished', async () => {
    const { ribbon, set } = await hiddenSetRibbon();
    set.hidden = false;
    await set.updateComplete;
    await ribbon.updateComplete;
    ribbon.activeTabId = 'format';
    await ribbon.updateComplete;

    set.hidden = true;
    await set.updateComplete;
    await ribbon.updateComplete;
    expect(tabLabels(ribbon)).toEqual(['Home']);
    expect(ribbon.activeTabId).toBe('home');
    expect(live(ribbon)).toBe('Picture Tools, contextual, hidden');
  });

  it('does not announce a change that is not a visibility transition', async () => {
    const { ribbon, set } = await hiddenSetRibbon();
    set.color = '#000';
    await set.updateComplete;
    await ribbon.updateComplete;
    expect(live(ribbon)).toBe('');
  });
});
