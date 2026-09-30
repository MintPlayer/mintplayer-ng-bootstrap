import { afterEach, describe, expect, it } from 'vitest';

import './mp-ribbon.element';
import './mp-ribbon-tab.element';
import './mp-ribbon-group.element';
import './items/mp-ribbon-button.element';

import type { MpRibbon } from './mp-ribbon.element';

/**
 * Keyboard paths of mp-ribbon: the tab strip's roving arrows, Ctrl+Arrow
 * between groups, the tab double-click, and KeyTips at the items level.
 */

const mounted: HTMLElement[] = [];

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const nextRaf = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

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
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  while (mounted.length) mounted.pop()!.remove();
});

const THREE_TABS = `
  <mp-ribbon>
    <mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab>
    <mp-ribbon-tab tab-id="insert" label="Insert"></mp-ribbon-tab>
    <mp-ribbon-tab tab-id="view" label="View"></mp-ribbon-tab>
  </mp-ribbon>`;

const tabs = (ribbon: MpRibbon) => [...ribbon.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')];
const focusedTab = (ribbon: MpRibbon) => ribbon.shadowRoot!.activeElement?.textContent?.trim();

function keyOnTablist(ribbon: MpRibbon, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  (ribbon.shadowRoot!.activeElement ?? tabs(ribbon)[0]).dispatchEvent(event);
  return event;
}

describe('mp-ribbon — tab strip keyboard', () => {
  it('ArrowRight / ArrowDown move focus forward and stop at the last tab', async () => {
    const ribbon = await mount(THREE_TABS);
    tabs(ribbon)[0].focus();
    expect(keyOnTablist(ribbon, 'ArrowRight').defaultPrevented).toBe(true);
    expect(focusedTab(ribbon)).toBe('Insert');
    keyOnTablist(ribbon, 'ArrowDown');
    expect(focusedTab(ribbon)).toBe('View');
    keyOnTablist(ribbon, 'ArrowDown');
    expect(focusedTab(ribbon)).toBe('View');
  });

  it('ArrowLeft / ArrowUp move focus back and stop at the first tab', async () => {
    const ribbon = await mount(THREE_TABS);
    tabs(ribbon)[0].focus();
    keyOnTablist(ribbon, 'End');
    expect(focusedTab(ribbon)).toBe('View');
    keyOnTablist(ribbon, 'ArrowLeft');
    expect(focusedTab(ribbon)).toBe('Insert');
    keyOnTablist(ribbon, 'ArrowUp');
    expect(focusedTab(ribbon)).toBe('Home');
    keyOnTablist(ribbon, 'ArrowUp');
    expect(focusedTab(ribbon)).toBe('Home');
  });

  it('Home and End jump to the first and last tab', async () => {
    const ribbon = await mount(THREE_TABS);
    tabs(ribbon)[1].focus();
    keyOnTablist(ribbon, 'End');
    expect(focusedTab(ribbon)).toBe('View');
    keyOnTablist(ribbon, 'Home');
    expect(focusedTab(ribbon)).toBe('Home');
  });

  it('arrows only move focus; Enter and Space activate the focused tab', async () => {
    const ribbon = await mount(THREE_TABS);
    const changes: string[] = [];
    ribbon.addEventListener('tab-change', (e) =>
      changes.push((e as CustomEvent<{ activeTabId: string }>).detail.activeTabId)
    );
    tabs(ribbon)[0].focus();
    keyOnTablist(ribbon, 'ArrowRight');
    expect(ribbon.activeTabId).toBe('home');
    keyOnTablist(ribbon, 'Enter');
    expect(ribbon.activeTabId).toBe('insert');
    await ribbon.updateComplete;
    keyOnTablist(ribbon, 'ArrowRight');
    keyOnTablist(ribbon, ' ');
    expect(ribbon.activeTabId).toBe('view');
    expect(changes).toEqual(['insert', 'view']);
  });

  it('leaves keys it does not own alone', async () => {
    const ribbon = await mount(THREE_TABS);
    tabs(ribbon)[0].focus();
    expect(keyOnTablist(ribbon, 'a').defaultPrevented).toBe(false);
  });

  it('flips ArrowLeft / ArrowRight in RTL, keeping ArrowUp / ArrowDown neutral', async () => {
    const ribbon = await mount(THREE_TABS);
    ribbon.style.direction = 'rtl';
    tabs(ribbon)[0].focus();
    keyOnTablist(ribbon, 'ArrowLeft');
    expect(focusedTab(ribbon)).toBe('Insert');
    keyOnTablist(ribbon, 'ArrowRight');
    expect(focusedTab(ribbon)).toBe('Home');
    keyOnTablist(ribbon, 'ArrowDown');
    expect(focusedTab(ribbon)).toBe('Insert');
  });

  it('double-clicking a tab toggles minimized and reports it', async () => {
    const ribbon = await mount(THREE_TABS);
    const events: boolean[] = [];
    ribbon.addEventListener('minimize-toggle', (e) =>
      events.push((e as CustomEvent<{ minimized: boolean }>).detail.minimized)
    );
    tabs(ribbon)[1].dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
    expect(ribbon.minimized).toBe(true);
    await ribbon.updateComplete;
    tabs(ribbon)[1].dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
    expect(ribbon.minimized).toBe(false);
    expect(events).toEqual([true, false]);
  });

  it('clicking a tab selects it', async () => {
    const ribbon = await mount(THREE_TABS);
    tabs(ribbon)[2].click();
    expect(ribbon.activeTabId).toBe('view');
  });
});

// auto-scale="false" keeps the overflow reflow from collapsing the groups:
// jsdom lays everything out at zero width, so the inter-group gaps alone
// would read as overflow.
const GROUPS = `
  <mp-ribbon>
    <mp-ribbon-tab tab-id="home" label="Home">
      <mp-ribbon-group group-id="clipboard" label="Clipboard" auto-scale="false">
        <mp-ribbon-button item-id="paste" label="Paste"></mp-ribbon-button>
      </mp-ribbon-group>
      <mp-ribbon-group group-id="font" label="Font" auto-scale="false">
        <mp-ribbon-button item-id="bold" label="Bold"></mp-ribbon-button>
        <mp-ribbon-button item-id="italic" label="Italic"></mp-ribbon-button>
      </mp-ribbon-group>
      <mp-ribbon-group group-id="off" label="Disabled" auto-scale="false">
        <mp-ribbon-button item-id="none" label="None" disabled></mp-ribbon-button>
      </mp-ribbon-group>
    </mp-ribbon-tab>
  </mp-ribbon>`;

const item = (ribbon: MpRibbon, id: string) =>
  ribbon.querySelector<HTMLElement>(`mp-ribbon-button[item-id="${id}"]`)!;
const group = (ribbon: MpRibbon, id: string) =>
  ribbon.querySelector<HTMLElement>(`mp-ribbon-group[group-id="${id}"]`)!;

function ctrlArrow(from: HTMLElement, key: 'ArrowLeft' | 'ArrowRight'): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: true,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  from.dispatchEvent(event);
  return event;
}

describe('mp-ribbon — Ctrl+Arrow between groups', () => {
  it('Ctrl+ArrowRight focuses the next group\'s first item', async () => {
    const ribbon = await mount(GROUPS);
    const event = ctrlArrow(item(ribbon, 'paste'), 'ArrowRight');
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(item(ribbon, 'bold'));
  });

  it('prefers the group\'s roving item (tabindex 0) over its first item', async () => {
    const ribbon = await mount(GROUPS);
    item(ribbon, 'bold').setAttribute('tabindex', '-1');
    item(ribbon, 'italic').setAttribute('tabindex', '0');
    ctrlArrow(item(ribbon, 'paste'), 'ArrowRight');
    expect(document.activeElement).toBe(item(ribbon, 'italic'));
  });

  it('Ctrl+ArrowLeft goes back; the first group has nowhere to go', async () => {
    const ribbon = await mount(GROUPS);
    ctrlArrow(item(ribbon, 'bold'), 'ArrowLeft');
    expect(document.activeElement).toBe(item(ribbon, 'paste'));
    expect(ctrlArrow(item(ribbon, 'paste'), 'ArrowLeft').defaultPrevented).toBe(false);
  });

  it('does not move into a group whose every item is disabled', async () => {
    const ribbon = await mount(GROUPS);
    item(ribbon, 'bold').focus();
    const event = ctrlArrow(item(ribbon, 'bold'), 'ArrowRight');
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(item(ribbon, 'bold'));
  });

  it('skips a collapsed group unless its popup is open', async () => {
    const ribbon = await mount(GROUPS);
    group(ribbon, 'font').setAttribute('data-resolved-size', 'popup');
    // The collapsed group is out of the walk, so from Clipboard the next
    // group is the all-disabled one: nothing to focus.
    expect(ctrlArrow(item(ribbon, 'paste'), 'ArrowRight').defaultPrevented).toBe(false);
    group(ribbon, 'font').setAttribute('data-popup-open', '');
    ctrlArrow(item(ribbon, 'paste'), 'ArrowRight');
    expect(document.activeElement).toBe(item(ribbon, 'bold'));
  });

  it('flips direction in RTL', async () => {
    const ribbon = await mount(GROUPS);
    ribbon.style.direction = 'rtl';
    ctrlArrow(item(ribbon, 'paste'), 'ArrowLeft');
    expect(document.activeElement).toBe(item(ribbon, 'bold'));
  });

  it('leaves Ctrl+Arrow on a tab to the tablist', async () => {
    const ribbon = await mount(GROUPS);
    tabs(ribbon)[0].focus();
    ctrlArrow(tabs(ribbon)[0], 'ArrowRight');
    // Focus stays in the tab strip rather than jumping into a group.
    expect(ribbon.shadowRoot!.activeElement).toBe(tabs(ribbon)[0]);
    expect(document.activeElement).toBe(ribbon);
  });

  it('ignores Ctrl+Arrow from outside any group', async () => {
    const ribbon = await mount(GROUPS);
    expect(ctrlArrow(ribbon, 'ArrowRight').defaultPrevented).toBe(false);
  });

  it('ignores a group that is not in the active tab', async () => {
    const ribbon = await mount(`
      <mp-ribbon>
        <mp-ribbon-tab tab-id="home" label="Home">
          <mp-ribbon-group group-id="a" label="A" auto-scale="false">
            <mp-ribbon-button item-id="a1" label="A1"></mp-ribbon-button>
          </mp-ribbon-group>
        </mp-ribbon-tab>
        <mp-ribbon-tab tab-id="insert" label="Insert">
          <mp-ribbon-group group-id="b" label="B" auto-scale="false">
            <mp-ribbon-button item-id="b1" label="B1"></mp-ribbon-button>
          </mp-ribbon-group>
        </mp-ribbon-tab>
      </mp-ribbon>`);
    expect(ctrlArrow(item(ribbon, 'b1'), 'ArrowLeft').defaultPrevented).toBe(false);
  });
});

function pressAlt(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', cancelable: true }));
}

function pressKey(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  document.dispatchEvent(event);
  return event;
}

type KeyTipView = { keyTipMode: string; keyTipBadges: { tip: string; target: HTMLElement }[] };
const view = (ribbon: MpRibbon) => ribbon as unknown as KeyTipView;

async function openItemsLevel(ribbon: MpRibbon, tabTip: string): Promise<void> {
  pressAlt();
  await ribbon.updateComplete;
  pressKey(tabTip);
  await ribbon.updateComplete;
  await nextRaf();
  await ribbon.updateComplete;
}

describe('mp-ribbon — KeyTips at the items level', () => {
  it('badges every enabled item of the active tab and renders them as an overlay', async () => {
    const ribbon = await mount(GROUPS);
    await openItemsLevel(ribbon, 'H');
    expect(view(ribbon).keyTipMode).toBe('items');
    const targets = view(ribbon).keyTipBadges.map((b) => b.target.getAttribute('item-id'));
    expect(targets).toEqual(['paste', 'bold', 'italic']);
    const rendered = [...ribbon.shadowRoot!.querySelectorAll('.keytip-badge')].map((b) => b.textContent);
    expect(rendered).toEqual(view(ribbon).keyTipBadges.map((b) => b.tip));
  });

  it('pressing an item\'s tip clicks it and closes the overlay', async () => {
    const ribbon = await mount(GROUPS);
    await openItemsLevel(ribbon, 'H');
    let clicked = false;
    item(ribbon, 'bold').addEventListener('click', () => (clicked = true));
    const tip = view(ribbon).keyTipBadges.find((b) => b.target === item(ribbon, 'bold'))!.tip;
    expect(pressKey(tip).defaultPrevented).toBe(true);
    expect(clicked).toBe(true);
    expect(view(ribbon).keyTipMode).toBe('off');
  });

  it('a letter that matches no badge does nothing', async () => {
    const ribbon = await mount(GROUPS);
    await openItemsLevel(ribbon, 'H');
    expect(pressKey('Q').defaultPrevented).toBe(false);
    expect(view(ribbon).keyTipMode).toBe('items');
  });

  it('Escape unwinds items -> tabs -> off', async () => {
    const ribbon = await mount(GROUPS);
    await openItemsLevel(ribbon, 'H');
    pressKey('Escape');
    expect(view(ribbon).keyTipMode).toBe('tabs');
    pressKey('Escape');
    expect(view(ribbon).keyTipMode).toBe('off');
  });

  it('Alt while the overlay is open closes it', async () => {
    const ribbon = await mount(GROUPS);
    await openItemsLevel(ribbon, 'H');
    pressAlt();
    expect(view(ribbon).keyTipMode).toBe('off');
  });

  it('a collapsed group gets one badge, on its popup trigger', async () => {
    const ribbon = await mount(GROUPS);
    const font = group(ribbon, 'font');
    font.setAttribute('data-resolved-size', 'popup');
    font.setAttribute('data-key-tip', 'F');
    await (font as unknown as { updateComplete: Promise<void> }).updateComplete;
    await openItemsLevel(ribbon, 'H');
    const badge = view(ribbon).keyTipBadges.find((b) => b.tip === 'F')!;
    expect(badge.target.classList.contains('ribbon-popup-trigger')).toBe(true);
    expect(view(ribbon).keyTipBadges.some((b) => b.target === item(ribbon, 'bold'))).toBe(false);
  });

  it('keys other than Alt, Escape and a letter are ignored while open', async () => {
    const ribbon = await mount(GROUPS);
    pressAlt();
    await ribbon.updateComplete;
    expect(pressKey('ArrowDown').defaultPrevented).toBe(false);
    expect(view(ribbon).keyTipMode).toBe('tabs');
  });

  it('keyup of a non-Alt key does not toggle the overlay', async () => {
    const ribbon = await mount(GROUPS);
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
    expect(view(ribbon).keyTipMode).toBe('off');
  });
});
