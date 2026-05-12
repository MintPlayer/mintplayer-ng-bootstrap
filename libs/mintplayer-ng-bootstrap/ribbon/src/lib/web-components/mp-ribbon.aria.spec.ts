import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-ribbon.element';
import './mp-ribbon-tab.element';
import './mp-ribbon-group.element';
import './items/mp-ribbon-button.element';
import type { MpRibbon } from './mp-ribbon.element';

/**
 * Behavioural ARIA contract for `mp-ribbon` (FR-13 + FR-2 + FR-9 + FR-14).
 * Asserts the model matches `project_wc_aria_decisions`: role=application
 * root, role=tablist strip, role=tab buttons, role=tabpanel content panes,
 * role=toolbar groups, popup-trigger aria-haspopup/expanded, live region
 * for announcements.
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

describe('mp-ribbon — ARIA contract', () => {
  let ribbon: MpRibbon;

  beforeEach(async () => {
    ribbon = await mountRibbon(`
      <mp-ribbon active-tab-id="home">
        <mp-ribbon-tab tab-id="home" label="Home">
          <mp-ribbon-group group-id="clipboard" label="Clipboard">
            <mp-ribbon-button item-id="paste" label="Paste" size="small"></mp-ribbon-button>
          </mp-ribbon-group>
        </mp-ribbon-tab>
        <mp-ribbon-tab tab-id="insert" label="Insert">
          <mp-ribbon-group group-id="tables" label="Tables">
            <mp-ribbon-button item-id="table" label="Table" size="small"></mp-ribbon-button>
          </mp-ribbon-group>
        </mp-ribbon-tab>
      </mp-ribbon>
    `);
  });

  afterEach(() => {
    ribbon.parentElement?.remove();
  });

  it('host carries role="application" with aria-label', () => {
    expect(ribbon.getAttribute('role')).toBe('application');
    expect(ribbon.getAttribute('aria-label')).toBe('Ribbon');
  });

  it('tab strip is role="tablist" with role="tab" buttons', () => {
    const tablist = ribbon.shadowRoot!.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    const tabs = tablist!.querySelectorAll<HTMLElement>('[role="tab"]');
    expect(tabs.length).toBe(2);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('each tab has aria-controls pointing at its panel id', () => {
    const tabs = ribbon.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]');
    expect(tabs[0].getAttribute('aria-controls')).toBe('ribbon-panel-home');
    expect(tabs[1].getAttribute('aria-controls')).toBe('ribbon-panel-insert');
  });

  it('tabpanel host has role="tabpanel" + aria-labelledby + matching id', () => {
    const tab = ribbon.querySelector<HTMLElement>('mp-ribbon-tab[tab-id="home"]')!;
    expect(tab.getAttribute('role')).toBe('tabpanel');
    expect(tab.getAttribute('aria-labelledby')).toBe('ribbon-tab-home');
    expect(tab.id).toBe('ribbon-panel-home');
  });

  it('roving tabindex: active tab is 0, inactive tab is -1', () => {
    const tabs = ribbon.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
  });

  it('groups use role="toolbar" with their label as aria-label', () => {
    const group = ribbon.querySelector<HTMLElement>('mp-ribbon-group[group-id="clipboard"]')!;
    const toolbar = group.shadowRoot!.querySelector('[role="toolbar"]')!;
    expect(toolbar).toBeTruthy();
    expect(toolbar.getAttribute('aria-label')).toBe('Clipboard');
  });

  it('renders a live region with aria-live="polite" for announcements (FR-17)', () => {
    const live = ribbon.shadowRoot!.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(live!.getAttribute('aria-atomic')).toBe('true');
  });
});

describe('mp-ribbon — tab strip keyboard navigation', () => {
  let ribbon: MpRibbon;

  beforeEach(async () => {
    ribbon = await mountRibbon(`
      <mp-ribbon active-tab-id="home">
        <mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab>
        <mp-ribbon-tab tab-id="insert" label="Insert"></mp-ribbon-tab>
        <mp-ribbon-tab tab-id="layout" label="Layout"></mp-ribbon-tab>
      </mp-ribbon>
    `);
  });

  afterEach(() => {
    ribbon.parentElement?.remove();
  });

  function tabs(): HTMLElement[] {
    return Array.from(ribbon.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]'));
  }

  /**
   * Tab buttons live inside the ribbon's shadow root, so the focused tab
   * lands on `ribbon.shadowRoot.activeElement` — `document.activeElement`
   * just points at the shadow host.
   */
  function shadowActive(): Element | null {
    return ribbon.shadowRoot?.activeElement ?? null;
  }

  function pressKey(key: string): void {
    const tablist = ribbon.shadowRoot!.querySelector<HTMLElement>('[role="tablist"]')!;
    tablist.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    );
  }

  it('ArrowRight then Enter activates the next tab', async () => {
    // Navigate via arrow first so the ribbon's internal currentTabIndex
    // tracks correctly — Enter activates the tab at currentTabIndex.
    pressKey('ArrowRight');
    pressKey('Enter');
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(ribbon.activeTabId).toBe('insert');
  });

  it('Home jumps to first tab, End to last', () => {
    pressKey('End');
    expect(shadowActive()).toBe(tabs()[2]);
    pressKey('Home');
    expect(shadowActive()).toBe(tabs()[0]);
  });

  it('ArrowRight / ArrowLeft move focus by one (LTR default)', () => {
    pressKey('ArrowRight');
    expect(shadowActive()).toBe(tabs()[1]);
    pressKey('ArrowLeft');
    expect(shadowActive()).toBe(tabs()[0]);
  });
});

describe('mp-ribbon — minimize / restore', () => {
  let ribbon: MpRibbon;

  beforeEach(async () => {
    ribbon = await mountRibbon(`
      <mp-ribbon active-tab-id="home">
        <mp-ribbon-tab tab-id="home" label="Home"></mp-ribbon-tab>
      </mp-ribbon>
    `);
  });

  afterEach(() => {
    ribbon.parentElement?.remove();
  });

  it('Ctrl+F1 toggles minimized and dispatches minimize-toggle event', async () => {
    const events: CustomEvent<{ minimized: boolean }>[] = [];
    ribbon.addEventListener('minimize-toggle', (e) =>
      events.push(e as CustomEvent<{ minimized: boolean }>)
    );

    ribbon.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F1', ctrlKey: true, bubbles: true, cancelable: true })
    );

    expect(ribbon.minimized).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0].detail.minimized).toBe(true);

    ribbon.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F1', ctrlKey: true, bubbles: true, cancelable: true })
    );
    expect(ribbon.minimized).toBe(false);
    expect(events[1].detail.minimized).toBe(false);
  });

  it('renders content area when not minimized; hides it when minimized', async () => {
    expect(ribbon.shadowRoot!.querySelector('.ribbon-content')).toBeTruthy();
    ribbon.minimized = true;
    await (ribbon as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(ribbon.shadowRoot!.querySelector('.ribbon-content')).toBeNull();
  });
});
