import { afterEach, describe, expect, it } from 'vitest';

import './mp-ribbon.element';
import './mp-ribbon-tab.element';
import './mp-ribbon-group.element';
import './items/mp-ribbon-button.element';

import type { MpRibbon } from './mp-ribbon.element';

/**
 * `mp-ribbon`'s mode machinery: layout (Classic/Simplified), the landmark name,
 * theming attributes, minimize, and the overflow reflow's early exits.
 *
 * Deliberately NOT the overflow algorithm itself. That reads `offsetWidth` and
 * `clientWidth`, which jsdom reports as 0 — faking layout metrics would
 * manufacture coverage over an algorithm whose entire subject is real geometry,
 * and the resulting green would mean nothing. Its guard clauses ARE reachable
 * without layout, so those are here and the measuring path stays with the
 * Playwright suites.
 */

const mounted: HTMLElement[] = [];

async function mount(markup: string): Promise<MpRibbon> {
  const container = document.createElement('div');
  container.innerHTML = markup;
  document.body.appendChild(container);
  mounted.push(container);
  const ribbon = container.querySelector('mp-ribbon') as MpRibbon;
  await ribbon.updateComplete;
  // slotchange lands in a microtask after the first render.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await ribbon.updateComplete;
  return ribbon;
}

const RIBBON = `
  <mp-ribbon>
    <mp-ribbon-tab tab-id="home" label="Home">
      <mp-ribbon-group group-id="clipboard" label="Clipboard">
        <mp-ribbon-button item-id="paste" label="Paste" size="large"></mp-ribbon-button>
        <mp-ribbon-button item-id="copy" label="Copy" size="medium"></mp-ribbon-button>
      </mp-ribbon-group>
    </mp-ribbon-tab>
    <mp-ribbon-tab tab-id="insert" label="Insert">
      <mp-ribbon-group group-id="tables" label="Tables">
        <mp-ribbon-button item-id="table" label="Table" size="large"></mp-ribbon-button>
      </mp-ribbon-group>
    </mp-ribbon-tab>
  </mp-ribbon>`;

const items = (ribbon: HTMLElement) => [...ribbon.querySelectorAll<HTMLElement>('mp-ribbon-button')];

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

// ---------------------------------------------------------------------------

describe('mp-ribbon — landmark name', () => {
  it('is a region, not an application', async () => {
    const ribbon = await mount(RIBBON);
    expect(ribbon.getAttribute('role')).toBe('region');
  });

  it('names the landmark by default', async () => {
    const ribbon = await mount(RIBBON);
    expect(ribbon.getAttribute('aria-label')).toBe('Ribbon');
  });

  it('uses an explicit region-label', async () => {
    const ribbon = await mount('<mp-ribbon region-label="Formatting"></mp-ribbon>');
    expect(ribbon.getAttribute('aria-label')).toBe('Formatting');
  });

  // The audit's "unconditional setAttribute" finding: a consumer's own label is
  // typically the localized one, and overwriting it renames the landmark.
  it('never clobbers a consumer-authored aria-label', async () => {
    const ribbon = await mount('<mp-ribbon aria-label="Mine"></mp-ribbon>');
    expect(ribbon.getAttribute('aria-label')).toBe('Mine');
  });

  it('leaves a consumer-authored label alone when region-label changes later', async () => {
    const ribbon = await mount('<mp-ribbon aria-label="Mine"></mp-ribbon>');
    ribbon.regionLabel = 'Formatting';
    await ribbon.updateComplete;
    expect(ribbon.getAttribute('aria-label')).toBe('Mine');
  });

  it('follows region-label when it owns the attribute', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.regionLabel = 'Formatting';
    await ribbon.updateComplete;
    expect(ribbon.getAttribute('aria-label')).toBe('Formatting');
  });

  it('does not claim a role the consumer already set', async () => {
    const ribbon = await mount('<mp-ribbon role="toolbar"></mp-ribbon>');
    expect(ribbon.getAttribute('role')).toBe('toolbar');
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon — theming attributes', () => {
  it.each(['office-2007', 'office-2010', 'office-2013', 'office-2016'] as const)(
    'reflects version=%s so the shadow CSS can switch',
    async (version) => {
      const ribbon = await mount(RIBBON);
      ribbon.version = version;
      await ribbon.updateComplete;
      expect(ribbon.getAttribute('version')).toBe(version);
    },
  );

  it('defaults to office-2016', async () => {
    const ribbon = await mount(RIBBON);
    expect(ribbon.version).toBe('office-2016');
  });

  it.each(['light', 'dark', 'auto'] as const)('reflects color-scheme=%s', async (scheme) => {
    const ribbon = await mount(RIBBON);
    ribbon.colorScheme = scheme;
    await ribbon.updateComplete;
    expect(ribbon.getAttribute('color-scheme')).toBe(scheme);
  });

  it.each(['on', 'off', 'auto'] as const)('reflects touch-mode=%s', async (mode) => {
    const ribbon = await mount(RIBBON);
    ribbon.touchMode = mode;
    await ribbon.updateComplete;
    expect(ribbon.getAttribute('touch-mode')).toBe(mode);
  });

  it('defaults both scheme and touch mode to auto', async () => {
    const ribbon = await mount(RIBBON);
    expect(ribbon.colorScheme).toBe('auto');
    expect(ribbon.touchMode).toBe('auto');
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon — Simplified layout (FR-39)', () => {
  it('starts in classic', async () => {
    const ribbon = await mount(RIBBON);
    expect(ribbon.layout).toBe('classic');
    expect(ribbon.getAttribute('layout')).toBe('classic');
  });

  // CSS custom properties can be read in `var()` but not used as conditional
  // selectors, so each descendant needs the stamp to switch its own shadow CSS.
  it('stamps data-ribbon-layout on every slotted descendant', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.layout = 'simplified';
    await ribbon.updateComplete;

    const stamped = ribbon.querySelectorAll('[data-ribbon-layout="simplified"]');
    expect(stamped.length).toBeGreaterThan(0);
    for (const tag of ['mp-ribbon-tab', 'mp-ribbon-group', 'mp-ribbon-button']) {
      expect(ribbon.querySelector(`${tag}[data-ribbon-layout="simplified"]`)).not.toBeNull();
    }
  });

  it('restamps every descendant when switching back to classic', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.layout = 'simplified';
    await ribbon.updateComplete;
    ribbon.layout = 'classic';
    await ribbon.updateComplete;
    expect(ribbon.querySelectorAll('[data-ribbon-layout="simplified"]')).toHaveLength(0);
    expect(ribbon.querySelectorAll('[data-ribbon-layout="classic"]').length).toBeGreaterThan(0);
  });

  it('forces every item to small', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.layout = 'simplified';
    await ribbon.updateComplete;
    expect(items(ribbon).map((i) => i.getAttribute('size'))).toEqual(['small', 'small', 'small']);
  });

  // The consumer-declared size is saved on the way in and restored on the way
  // out; without that, one round-trip through Simplified would permanently
  // flatten a carefully authored Classic layout.
  it('restores each item to the size the consumer declared', async () => {
    const ribbon = await mount(RIBBON);
    const before = items(ribbon).map((i) => i.getAttribute('size'));
    ribbon.layout = 'simplified';
    await ribbon.updateComplete;
    ribbon.layout = 'classic';
    await ribbon.updateComplete;
    expect(items(ribbon).map((i) => i.getAttribute('size'))).toEqual(before);
  });

  it('survives repeated round-trips', async () => {
    const ribbon = await mount(RIBBON);
    const before = items(ribbon).map((i) => i.getAttribute('size'));
    for (let i = 0; i < 3; i++) {
      ribbon.layout = 'simplified';
      await ribbon.updateComplete;
      ribbon.layout = 'classic';
      await ribbon.updateComplete;
    }
    expect(items(ribbon).map((i) => i.getAttribute('size'))).toEqual(before);
  });

  it('treats an item with no declared size as medium', async () => {
    const ribbon = await mount(`
      <mp-ribbon>
        <mp-ribbon-tab tab-id="home" label="Home">
          <mp-ribbon-group group-id="g" label="G">
            <mp-ribbon-button item-id="a" label="A"></mp-ribbon-button>
          </mp-ribbon-group>
        </mp-ribbon-tab>
      </mp-ribbon>`);
    ribbon.layout = 'simplified';
    await ribbon.updateComplete;
    ribbon.layout = 'classic';
    await ribbon.updateComplete;
    expect(items(ribbon)[0].getAttribute('size')).toBe('medium');
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon — minimize', () => {
  it('starts expanded', async () => {
    const ribbon = await mount(RIBBON);
    expect(ribbon.minimized).toBe(false);
  });

  it('announces minimize and restore', async () => {
    const ribbon = await mount(RIBBON);
    const live = () => ribbon.shadowRoot!.querySelector('[aria-live]')!.textContent?.trim();

    ribbon.minimized = true;
    await ribbon.updateComplete;
    expect(live()).toBe('Ribbon minimized');

    ribbon.minimized = false;
    await ribbon.updateComplete;
    expect(live()).toBe('Ribbon restored');
  });

  // The announcement is a state CHANGE, not a description of the initial
  // render — announcing "Ribbon restored" on load would be noise.
  it('says nothing on the first render', async () => {
    const ribbon = await mount(RIBBON);
    expect(ribbon.shadowRoot!.querySelector('[aria-live]')!.textContent?.trim()).toBe('');
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon — active tab', () => {
  it('activates the first tab when none is declared', async () => {
    const ribbon = await mount(RIBBON);
    expect(ribbon.activeTabId).toBe('home');
  });

  it('honours a declared active tab', async () => {
    const ribbon = await mount(RIBBON.replace('<mp-ribbon>', '<mp-ribbon active-tab-id="insert">'));
    expect(ribbon.activeTabId).toBe('insert');
  });

  // Under SSR hydration an Angular `[attr.active-tab-id]` bound to an
  // as-yet-empty signal can clear the default AFTER processSlot picked it, so
  // the ribbon must re-default rather than render with no active tab at all.
  it('re-defaults when the active tab is cleared externally', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.activeTabId = '';
    await ribbon.updateComplete;
    expect(ribbon.activeTabId).toBe('home');
  });

  it('marks exactly one tab active in the light DOM', async () => {
    const ribbon = await mount(RIBBON);
    const active = [...ribbon.querySelectorAll('mp-ribbon-tab')].filter((t) => t.hasAttribute('active'));
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute('tab-id')).toBe('home');
  });

  it('moves the active marker when the tab changes', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.activeTabId = 'insert';
    await ribbon.updateComplete;
    const active = [...ribbon.querySelectorAll('mp-ribbon-tab')].filter((t) => t.hasAttribute('active'));
    expect(active.map((t) => t.getAttribute('tab-id'))).toEqual(['insert']);
  });

  it('reflects the active tab id for consumer CSS', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.activeTabId = 'insert';
    await ribbon.updateComplete;
    expect(ribbon.getAttribute('active-tab-id')).toBe('insert');
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon — overflow reflow guards', () => {
  /** Drive the reflow directly; scheduleReflow needs a real animation frame. */
  const reflow = (ribbon: MpRibbon) =>
    (ribbon as unknown as { reflowOverflow(): void }).reflowOverflow();

  it('does nothing while minimized', async () => {
    const ribbon = await mount(RIBBON);
    const group = ribbon.querySelector('mp-ribbon-group')!;
    group.setAttribute('data-resolved-size', 'popup');
    ribbon.minimized = true;
    await ribbon.updateComplete;

    reflow(ribbon);
    expect(group.getAttribute('data-resolved-size')).toBe('popup');
  });

  it('does nothing when no tab is active', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.activeTabId = 'does-not-exist';
    expect(() => reflow(ribbon)).not.toThrow();
  });

  it('does nothing on a ribbon with no tabs', async () => {
    const ribbon = await mount('<mp-ribbon></mp-ribbon>');
    expect(() => reflow(ribbon)).not.toThrow();
  });

  // FR-39: in Simplified the shared end-of-tab chevron owns overflow, so any
  // popup chunking left over from a Classic session has to be stripped — a
  // stale `data-resolved-size` would hide a group behind a chevron that is no
  // longer rendered.
  it('strips leftover popup sizing when switching to simplified', async () => {
    const ribbon = await mount(RIBBON);
    const group = ribbon.querySelector('mp-ribbon-group')!;
    group.setAttribute('data-resolved-size', 'popup');
    ribbon.layout = 'simplified';
    await ribbon.updateComplete;

    reflow(ribbon);
    expect(group.hasAttribute('data-resolved-size')).toBe(false);
  });

  it('is a no-op in simplified when there is nothing to strip', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.layout = 'simplified';
    await ribbon.updateComplete;
    expect(() => reflow(ribbon)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon — teardown', () => {
  it('stops listening for KeyTips once removed', async () => {
    const ribbon = await mount(RIBBON);
    ribbon.remove();
    const event = new KeyboardEvent('keydown', { key: 'Alt', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('is safe to remove a ribbon that never rendered a tab', async () => {
    const ribbon = await mount('<mp-ribbon></mp-ribbon>');
    expect(() => ribbon.remove()).not.toThrow();
  });
});
