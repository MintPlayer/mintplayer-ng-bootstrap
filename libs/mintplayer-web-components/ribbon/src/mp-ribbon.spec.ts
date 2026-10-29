import { afterEach, describe, expect, it } from 'vitest';
import './generated';
import type { MpRibbon, MpRibbonGroupButton, MpRibbonToggleButton } from './generated';

// The Lit front of the D10 ribbon (#437). The tab strip is rendered from the
// ribbon's authored mp-ribbon-tab children (a content query), in the light DOM,
// so every IDREF resolves in one tree. jsdom lays nothing out: the reflow and
// the simplified overflow are covered by the e2e specs.

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await Promise.all([...document.querySelectorAll('*')].filter((el) => el.localName.startsWith('mp-')).map((el) => (el as unknown as { updateComplete?: Promise<unknown> }).updateComplete));
    await tick();
    await frame();
  }
}

async function mount(markup: string): Promise<MpRibbon> {
  document.body.innerHTML = markup;
  await settle();
  return document.querySelector('mp-ribbon') as MpRibbon;
}

afterEach(() => {
  document.body.innerHTML = '';
});

const BASIC = `
  <mp-ribbon>
    <mp-ribbon-tab tab-id="home" label="Home">
      <mp-ribbon-group group-id="clipboard" label="Clipboard">
        <mp-ribbon-button item-id="paste" label="Paste"></mp-ribbon-button>
        <mp-ribbon-button item-id="cut" label="Cut" size="small"></mp-ribbon-button>
      </mp-ribbon-group>
    </mp-ribbon-tab>
    <mp-ribbon-tab tab-id="insert" label="Insert"></mp-ribbon-tab>
    <mp-ribbon-tab tab-id="design" label="Design"></mp-ribbon-tab>
  </mp-ribbon>`;

// The element is the ribbon's root node (an mp-host template).
const root = (ribbon: MpRibbon): HTMLElement => (ribbon.matches('.ribbon') ? ribbon : ribbon.querySelector<HTMLElement>('.ribbon')!);
const tabs = (ribbon: MpRibbon) => [...ribbon.querySelectorAll<HTMLElement>('[role="tab"]')];
const tabLabels = (ribbon: MpRibbon) => tabs(ribbon).map((t) => t.textContent?.trim());
const selected = (ribbon: MpRibbon) => tabs(ribbon).find((t) => t.getAttribute('aria-selected') === 'true')?.getAttribute('data-ribbon-tab');
const live = (ribbon: MpRibbon) => ribbon.querySelector('[aria-live="polite"]')!.textContent?.trim();
const badges = (ribbon: MpRibbon) => [...ribbon.querySelectorAll('.keytip-badge')].map((b) => b.textContent?.trim());

function key(target: EventTarget, name: string, init: KeyboardEventInit = {}): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }));
}

async function pressAlt(): Promise<void> {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true, cancelable: true }));
  await settle();
}

describe('mp-ribbon — ARIA', () => {
  it('is a labelled region holding a tablist of tabs, built from its tab children', async () => {
    const ribbon = await mount(BASIC);
    expect(root(ribbon).getAttribute('role')).toBe('region');
    expect(root(ribbon).getAttribute('aria-label')).toBeTruthy();
    expect(ribbon.querySelector('[role="tablist"]')).not.toBeNull();
    expect(tabLabels(ribbon)).toEqual(['Home', 'Insert', 'Design']);
  });

  it('each tab controls a tabpanel in the same tree; only the active one is shown', async () => {
    const ribbon = await mount(BASIC);
    tabs(ribbon).forEach((tab) => {
      const panel = document.getElementById(tab.getAttribute('aria-controls')!);
      expect(panel?.getAttribute('role')).toBe('tabpanel');
      expect(panel!.hidden).toBe(tab.getAttribute('aria-selected') !== 'true');
    });
  });

  it('keeps a roving tabindex: the active tab is 0, the others -1', async () => {
    const ribbon = await mount(BASIC);
    expect(tabs(ribbon).map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('a group is a toolbar named by its label', async () => {
    const ribbon = await mount(BASIC);
    const group = ribbon.querySelector('[role="toolbar"]');
    expect(group?.getAttribute('aria-label')).toBe('Clipboard');
  });

  it('renders a polite live region for announcements', async () => {
    const ribbon = await mount(BASIC);
    expect(ribbon.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});

describe('mp-ribbon — keyboard', () => {
  it('arrows move focus and stop at the ends; Home and End jump', async () => {
    const ribbon = await mount(BASIC);
    const [home, insert, design] = tabs(ribbon);
    home.focus();
    key(home, 'ArrowRight');
    expect(document.activeElement).toBe(insert);
    key(insert, 'ArrowRight');
    key(design, 'ArrowRight');
    expect(document.activeElement).toBe(design);
    key(design, 'Home');
    expect(document.activeElement).toBe(home);
    key(home, 'ArrowLeft');
    expect(document.activeElement).toBe(home);
    key(home, 'End');
    expect(document.activeElement).toBe(design);
  });

  it('arrows only move focus; activating the focused tab selects it and reports it', async () => {
    const ribbon = await mount(BASIC);
    const changes: string[] = [];
    ribbon.addEventListener('activetabidchange', (e) => changes.push((e as CustomEvent<string>).detail));
    const [home, insert] = tabs(ribbon);
    home.focus();
    key(home, 'ArrowRight');
    await settle();
    expect(selected(ribbon)).toBe('home');
    insert.click();
    await settle();
    expect(selected(ribbon)).toBe('insert');
    expect(changes).toEqual(['insert']);
  });

  it('flips ArrowLeft and ArrowRight in RTL', async () => {
    const ribbon = await mount(BASIC);
    ribbon.style.direction = 'rtl';
    const [home, insert] = tabs(ribbon);
    home.focus();
    key(home, 'ArrowLeft');
    expect(document.activeElement).toBe(insert);
  });

  it('Ctrl+F1 minimizes and restores, hides the content, reports and announces it', async () => {
    const ribbon = await mount(BASIC);
    const changes: boolean[] = [];
    ribbon.addEventListener('minimizedchange', (e) => changes.push((e as CustomEvent<boolean>).detail));
    const [home] = tabs(ribbon);
    key(home, 'F1', { ctrlKey: true });
    await settle();
    expect(root(ribbon).hasAttribute('data-minimized')).toBe(true);
    expect(ribbon.minimized).toBe(true);
    expect(ribbon.querySelector<HTMLElement>('.ribbon-content')!.hidden).toBe(true);
    expect(live(ribbon)).toBe('Ribbon minimized');

    key(home, 'F1', { ctrlKey: true });
    await settle();
    expect(root(ribbon).hasAttribute('data-minimized')).toBe(false);
    expect(live(ribbon)).toBe('Ribbon restored');
    expect(changes).toEqual([true, false]);
  });

  it('double-clicking a tab toggles minimized', async () => {
    const ribbon = await mount(BASIC);
    tabs(ribbon)[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();
    expect(ribbon.minimized).toBe(true);
  });
});

describe('mp-ribbon — contextual tab sets', () => {
  const CONTEXTUAL = (visible: boolean) => `
    <mp-ribbon>
      <mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab>
      <mp-ribbon-contextual-tab-set label="Picture Tools" color="#5BAEFF"${visible ? '' : ' visible="false"'}>
        <mp-ribbon-tab tab-id="format" label="Format"></mp-ribbon-tab>
        <mp-ribbon-tab tab-id="crop" label="Crop"></mp-ribbon-tab>
      </mp-ribbon-contextual-tab-set>
      <mp-ribbon-tab tab-id="design" label="Design"></mp-ribbon-tab>
    </mp-ribbon>`;

  it('groups a visible set\'s tabs under a band carrying its label, in authored order', async () => {
    const ribbon = await mount(CONTEXTUAL(true));
    expect(tabLabels(ribbon)).toEqual(['Home', 'Format', 'Crop', 'Design']);
    expect(ribbon.querySelector('.ribbon-contextual-group-band')?.textContent?.trim()).toBe('Picture Tools');
  });

  it('omits a hidden set, then adds its tabs back and announces it when shown', async () => {
    const ribbon = await mount(CONTEXTUAL(false));
    expect(tabLabels(ribbon)).toEqual(['Home', 'Design']);
    ribbon.querySelector('mp-ribbon-contextual-tab-set')!.setAttribute('visible', '');
    await settle();
    expect(tabLabels(ribbon)).toEqual(['Home', 'Format', 'Crop', 'Design']);
    expect(live(ribbon)).toBe('Picture Tools, contextual, now available');
  });

  it('announces hiding, and moves the active tab off a tab that vanished', async () => {
    const ribbon = await mount(CONTEXTUAL(true));
    tabs(ribbon)[1].click();
    await settle();
    expect(selected(ribbon)).toBe('format');
    ribbon.querySelector('mp-ribbon-contextual-tab-set')!.setAttribute('visible', 'false');
    await settle();
    expect(tabLabels(ribbon)).toEqual(['Home', 'Design']);
    expect(live(ribbon)).toBe('Picture Tools, contextual, hidden');
    expect(['home', 'design']).toContain(selected(ribbon));
  });
});

describe('mp-ribbon — KeyTips', () => {
  it('Alt shows one badge per tab; Escape closes the overlay', async () => {
    const ribbon = await mount(BASIC);
    await pressAlt();
    expect(badges(ribbon)).toHaveLength(3);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
    expect(badges(ribbon)).toEqual([]);
  });

  it('a tab\'s letter switches to that tab', async () => {
    const ribbon = await mount(BASIC);
    await pressAlt();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true, cancelable: true }));
    await settle();
    expect(selected(ribbon)).toBe('insert');
  });

  it('an Alt combo (Alt+Tab) does not open the overlay', async () => {
    const ribbon = await mount(BASIC);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', altKey: true, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
    await settle();
    expect(badges(ribbon)).toEqual([]);
  });

  it('key-tips="off" leaves Alt alone', async () => {
    const ribbon = await mount(BASIC.replace('<mp-ribbon>', '<mp-ribbon key-tips="off">'));
    await pressAlt();
    expect(badges(ribbon)).toEqual([]);
  });
});

describe('mp-ribbon — items', () => {
  const ITEMS = `
    <mp-ribbon>
      <mp-ribbon-tab tab-id="home" label="Home">
        <mp-ribbon-group group-id="font" label="Font">
          <mp-ribbon-toggle-button item-id="bold" label="Bold" size="small"></mp-ribbon-toggle-button>
          <mp-ribbon-group-button item-id="align" label="Alignment" size="small"></mp-ribbon-group-button>
          <mp-ribbon-dropdown-button item-id="bullets" label="Bullets" size="small">
            <mp-ribbon-menu-item item-id="disc" label="Disc"></mp-ribbon-menu-item>
            <mp-ribbon-menu-separator></mp-ribbon-menu-separator>
            <mp-ribbon-menu-item item-id="ruler" label="Ruler" kind="checkbox"></mp-ribbon-menu-item>
          </mp-ribbon-dropdown-button>
        </mp-ribbon-group>
      </mp-ribbon-tab>
    </mp-ribbon>`;

  it('a toggle button reflects pressed on aria-pressed and reports a click', async () => {
    await mount(ITEMS);
    const toggle = document.querySelector('mp-ribbon-toggle-button') as MpRibbonToggleButton;
    const changes: boolean[] = [];
    toggle.addEventListener('pressedchange', (e) => changes.push((e as CustomEvent<boolean>).detail));
    const button = toggle.querySelector<HTMLElement>('button')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    await settle();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.pressed).toBe(true);
    expect(changes).toEqual([true]);
  });

  it('a group button is a radiogroup whose checked radio follows selectedValue', async () => {
    await mount(ITEMS);
    const group = document.querySelector('mp-ribbon-group-button') as MpRibbonGroupButton;
    group.buttons = [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
    ];
    group.selectedValue = 'left';
    await settle();
    expect(group.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Alignment');
    const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    radios[1].click();
    await settle();
    expect(group.selectedValue).toBe('center');
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);
  });

  it('a dropdown menu holds menuitems, a separator and a checkable entry', async () => {
    await mount(ITEMS);
    const menu = document.querySelector('mp-ribbon-dropdown-button [role="menu"]')!;
    expect([...menu.querySelectorAll('[role^="menuitem"]')].map((m) => m.getAttribute('role'))).toEqual(['menuitem', 'menuitemcheckbox']);
    expect(menu.querySelector('[role="separator"]')).not.toBeNull();
    expect(menu.querySelector('[role="menuitemcheckbox"]')?.getAttribute('aria-checked')).toBe('false');
  });

  it('the quick access toolbar is a toolbar', async () => {
    document.body.innerHTML = '<mp-quick-access-toolbar aria-label="Quick Access Toolbar"><mp-ribbon-button item-id="save" label="Save" size="small"></mp-ribbon-button></mp-quick-access-toolbar>';
    await settle();
    const qat = document.querySelector('.qat');
    expect(qat?.getAttribute('role')).toBe('toolbar');
  });
});
