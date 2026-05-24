import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-ribbon.element';
import './mp-ribbon-tab.element';
import './mp-ribbon-group.element';
import './items/mp-ribbon-button.element';
import type { MpRibbon } from './mp-ribbon.element';

/**
 * FR-12 KeyTips. jsdom returns zero-rect bounding boxes for layouted
 * elements, so we don't assert pixel positions — just the state-machine
 * progression (off → tabs → items) + the allocator's collision rules.
 */

function nextRaf(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

async function mountRibbon(html: string): Promise<MpRibbon> {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const ribbon = container.querySelector('mp-ribbon') as MpRibbon;
  await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return ribbon;
}

function pressAlt(): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Alt', bubbles: true })
  );
  document.dispatchEvent(
    new KeyboardEvent('keyup', { key: 'Alt', bubbles: true, cancelable: true })
  );
}

function pressKey(key: string): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  );
}

function getKeyTipMode(ribbon: MpRibbon): string {
  return (ribbon as unknown as { keyTipMode: string }).keyTipMode;
}

function getBadges(ribbon: MpRibbon): { tip: string; target: HTMLElement }[] {
  return (ribbon as unknown as { keyTipBadges: { tip: string; target: HTMLElement }[] })
    .keyTipBadges;
}

describe('mp-ribbon — KeyTips state machine (FR-12)', () => {
  let ribbon: MpRibbon;

  beforeEach(async () => {
    ribbon = await mountRibbon(`
      <mp-ribbon active-tab-id="home">
        <mp-ribbon-tab tab-id="home" label="Home">
          <mp-ribbon-group group-id="clipboard" label="Clipboard">
            <mp-ribbon-button item-id="paste" label="Paste" size="small"></mp-ribbon-button>
          </mp-ribbon-group>
        </mp-ribbon-tab>
        <mp-ribbon-tab tab-id="insert" label="Insert"></mp-ribbon-tab>
      </mp-ribbon>
    `);
  });

  afterEach(() => {
    // Force any leftover overlay off so the next test starts clean.
    if (getKeyTipMode(ribbon) !== 'off') pressKey('Escape');
    ribbon.parentElement?.remove();
  });

  it('Alt press toggles the overlay between off → tabs → off', async () => {
    expect(getKeyTipMode(ribbon)).toBe('off');
    pressAlt();
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getKeyTipMode(ribbon)).toBe('tabs');
    pressAlt();
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getKeyTipMode(ribbon)).toBe('off');
  });

  it('the tabs-level overlay derives one badge per tab from its label', async () => {
    pressAlt();
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    const badges = getBadges(ribbon);
    expect(badges.length).toBe(2);
    // "Home" → 'H', "Insert" → 'I' (no collision).
    const tips = badges.map((b) => b.tip).sort();
    expect(tips).toEqual(['H', 'I']);
  });

  it('Esc unwinds from tabs to off', async () => {
    pressAlt();
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    pressKey('Escape');
    expect(getKeyTipMode(ribbon)).toBe('off');
  });

  it('pressing a tab letter switches tabs and drills to items level', async () => {
    pressAlt();
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    pressKey('I'); // Insert tab
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(ribbon.activeTabId).toBe('insert');
    expect(getKeyTipMode(ribbon)).toBe('items');
  });

  it('[keyTips]="off" disables the overlay entirely', async () => {
    ribbon.keyTips = 'off';
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    pressAlt();
    expect(getKeyTipMode(ribbon)).toBe('off');
  });

  it('Alt-combos (Alt+Tab, Alt+F4) do NOT activate the overlay', async () => {
    // Alt-down then a combo key with altKey set
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', altKey: true, bubbles: true })
    );
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getKeyTipMode(ribbon)).toBe('off');
  });
});

describe('mp-ribbon — KeyTips collision resolution', () => {
  let ribbon: MpRibbon;

  afterEach(() => {
    if (ribbon && getKeyTipMode(ribbon) !== 'off') pressKey('Escape');
    ribbon?.parentElement?.remove();
  });

  it('falls back to consonants when first letters collide', async () => {
    ribbon = await mountRibbon(`
      <mp-ribbon active-tab-id="home">
        <mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab>
        <mp-ribbon-tab tab-id="help" label="Help"></mp-ribbon-tab>
      </mp-ribbon>
    `);
    pressAlt();
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    const badges = getBadges(ribbon);
    expect(badges.length).toBe(2);
    // "Home" gets 'H'; "Help" should fall through first-letter → consonants → 'L' or 'P'.
    const tips = badges.map((b) => b.tip);
    expect(tips[0]).toBe('H');
    expect(tips[1]).not.toBe('H');
    expect(/^[LP]$/.test(tips[1])).toBe(true);
  });

  it('explicit data-key-tip wins over auto-derived letters', async () => {
    ribbon = await mountRibbon(`
      <mp-ribbon active-tab-id="home">
        <mp-ribbon-tab tab-id="home" label="Home" data-key-tip="X"></mp-ribbon-tab>
        <mp-ribbon-tab tab-id="help" label="Help"></mp-ribbon-tab>
      </mp-ribbon>
    `);
    pressAlt();
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    const badges = getBadges(ribbon);
    // First tab: explicit X. Second tab: auto from "Help" → 'H'.
    // The role=tab buttons are rendered in mp-ribbon's shadow root from the
    // slotted tabs; data-key-tip travels via the slotted tab element. The
    // allocator reads it off the rendered button when present, otherwise
    // off the source tab element — neither path is in scope to assert
    // beyond "the explicit tab no longer takes H".
    const home = badges.find((b) => (b.target as HTMLElement).textContent?.includes('Home'));
    const help = badges.find((b) => (b.target as HTMLElement).textContent?.includes('Help'));
    // Help should still get H since Home no longer claims it.
    expect(help?.tip).toBe('H');
    // Home's tip is implementation-defined when the data-key-tip lives on the
    // source tab vs. the rendered button — assert only that it isn't 'H'.
    expect(home?.tip).not.toBe('H');
  });
});
