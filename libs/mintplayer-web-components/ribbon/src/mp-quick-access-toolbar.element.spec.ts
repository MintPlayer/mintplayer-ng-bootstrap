import { afterEach, describe, expect, it } from 'vitest';

import './mp-quick-access-toolbar.element';
import './items/mp-ribbon-button.element';

import type { MpQuickAccessToolbar } from './mp-quick-access-toolbar.element';

/**
 * The Quick Access Toolbar's whole job beyond layout is the APG toolbar
 * keyboard pattern, and every part of it is a place a bug hides silently:
 * ownership is decided by tag name (so an Angular wrapper's inner element is
 * found by drilling, not by taking the slotted child), disabled items are
 * skipped, and the arrow keys swap meaning under RTL.
 */

const mounted: HTMLElement[] = [];

async function mount(markup: string): Promise<MpQuickAccessToolbar> {
  const container = document.createElement('div');
  container.innerHTML = markup;
  document.body.appendChild(container);
  mounted.push(container);
  const toolbar = container.querySelector('mp-quick-access-toolbar') as MpQuickAccessToolbar;
  await toolbar.updateComplete;
  return toolbar;
}

const buttons = (toolbar: HTMLElement) =>
  [...toolbar.querySelectorAll<HTMLElement>('mp-ribbon-button')];

/**
 * Which item the toolbar asked to take focus.
 *
 * Asserted through a spy rather than `document.activeElement`: the ribbon items
 * carry `delegatesFocus` and no tabindex of their own (the roving index is
 * `mp-ribbon-group`'s job, not the toolbar's), and jsdom does not forward focus
 * through a shadow root's `delegatesFocus`. The behaviour under test is which
 * item the toolbar MOVES TO — that is exactly what this records, in every engine.
 */
function watchFocus(toolbar: HTMLElement) {
  const calls: HTMLElement[] = [];
  for (const item of buttons(toolbar)) {
    item.focus = () => {
      calls.push(item);
    };
  }
  return calls;
}

/**
 * Arrow handling reads `composedPath()` to find the item the user is on, so the
 * event has to be dispatched from that item — dispatching on the toolbar host
 * would leave the current index at -1.
 */
function press(item: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  item.dispatchEvent(event);
  return event;
}

const THREE = `
  <mp-quick-access-toolbar>
    <mp-ribbon-button item-id="a" label="A"></mp-ribbon-button>
    <mp-ribbon-button item-id="b" label="B"></mp-ribbon-button>
    <mp-ribbon-button item-id="c" label="C"></mp-ribbon-button>
  </mp-quick-access-toolbar>`;

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

describe('mp-quick-access-toolbar — role and name', () => {
  it('takes the toolbar role on the host, where assistive tech can see it', async () => {
    const toolbar = await mount(THREE);
    expect(toolbar.getAttribute('role')).toBe('toolbar');
  });

  it('names itself by default', async () => {
    const toolbar = await mount(THREE);
    expect(toolbar.getAttribute('aria-label')).toBe('Quick Access Toolbar');
  });

  it('uses an explicit label', async () => {
    const toolbar = await mount(
      '<mp-quick-access-toolbar label="Favourites"></mp-quick-access-toolbar>',
    );
    expect(toolbar.getAttribute('aria-label')).toBe('Favourites');
  });

  // A consumer's own aria-label is the more specific one, and typically the
  // localized one. Regression guard: `connectedCallback`'s "don't clobber" check
  // used to be dead code, because `updated()` then wrote the attribute
  // unconditionally whenever `label` was in the changed set — and a Lit property
  // with a class-field default IS in that set on the very first update.
  it('never clobbers a consumer-supplied aria-label', async () => {
    const toolbar = await mount(
      '<mp-quick-access-toolbar aria-label="Mine"></mp-quick-access-toolbar>',
    );
    expect(toolbar.getAttribute('aria-label')).toBe('Mine');
  });

  it('leaves a consumer-supplied aria-label alone when label changes later', async () => {
    const toolbar = await mount(
      '<mp-quick-access-toolbar aria-label="Mine"></mp-quick-access-toolbar>',
    );
    toolbar.label = 'Renamed';
    await toolbar.updateComplete;
    expect(toolbar.getAttribute('aria-label')).toBe('Mine');
  });

  it('respects a consumer-supplied aria-label before the first update lands', () => {
    const toolbar = document.createElement('mp-quick-access-toolbar');
    toolbar.setAttribute('aria-label', 'Mine');
    document.body.appendChild(toolbar);
    mounted.push(toolbar);
    expect(toolbar.getAttribute('aria-label')).toBe('Mine');
  });

  it('follows a later label change', async () => {
    const toolbar = await mount(THREE);
    toolbar.label = 'Renamed';
    await toolbar.updateComplete;
    expect(toolbar.getAttribute('aria-label')).toBe('Renamed');
  });

  it('reflects touch-mode for the sizing rules', async () => {
    const toolbar = await mount('<mp-quick-access-toolbar touch-mode="on"></mp-quick-access-toolbar>');
    expect(toolbar.getAttribute('touch-mode')).toBe('on');
  });
});

describe('mp-quick-access-toolbar — arrow navigation', () => {
  it('moves focus forward on ArrowRight', async () => {
    const toolbar = await mount(THREE);
    const [a, b] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(a, 'ArrowRight');
    expect(focused).toEqual([b]);
  });

  it('moves focus backward on ArrowLeft', async () => {
    const toolbar = await mount(THREE);
    const [, b, c] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(c, 'ArrowLeft');
    expect(focused).toEqual([b]);
  });

  it('jumps to the first item on Home', async () => {
    const toolbar = await mount(THREE);
    const [a, , c] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(c, 'Home');
    expect(focused).toEqual([a]);
  });

  it('jumps to the last item on End', async () => {
    const toolbar = await mount(THREE);
    const [a, , c] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(a, 'End');
    expect(focused).toEqual([c]);
  });

  // Clamped, not wrapped: the APG toolbar pattern allows either, and this one
  // stops at the ends. Pinning the choice so it cannot drift silently.
  it('stops at the last item rather than wrapping', async () => {
    const toolbar = await mount(THREE);
    const c = buttons(toolbar)[2];
    const focused = watchFocus(toolbar);
    press(c, 'ArrowRight');
    expect(focused).toEqual([]);
  });

  it('stops at the first item rather than wrapping', async () => {
    const toolbar = await mount(THREE);
    const a = buttons(toolbar)[0];
    const focused = watchFocus(toolbar);
    press(a, 'ArrowLeft');
    expect(focused).toEqual([]);
  });

  it('claims the arrow key it acted on', async () => {
    const toolbar = await mount(THREE);
    const a = buttons(toolbar)[0];
    watchFocus(toolbar);
    expect(press(a, 'ArrowRight').defaultPrevented).toBe(true);
  });

  // At the end of the row the key does nothing, so it must be left to the page
  // — swallowing it would break an outer handler for no benefit.
  it('leaves the key unclaimed when focus does not move', async () => {
    const toolbar = await mount(THREE);
    const c = buttons(toolbar)[2];
    watchFocus(toolbar);
    expect(press(c, 'ArrowRight').defaultPrevented).toBe(false);
  });

  it('ignores keys it does not own', async () => {
    const toolbar = await mount(THREE);
    const a = buttons(toolbar)[0];
    const focused = watchFocus(toolbar);
    expect(press(a, 'Enter').defaultPrevented).toBe(false);
    expect(focused).toEqual([]);
  });

  it('does nothing when the toolbar is empty', async () => {
    const toolbar = await mount('<mp-quick-access-toolbar></mp-quick-access-toolbar>');
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    expect(() => toolbar.dispatchEvent(event)).not.toThrow();
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('mp-quick-access-toolbar — which children count', () => {
  // A disabled control is not a stop in the toolbar's roving order; leaving it
  // in would strand a keyboard user on something they cannot activate.
  it('skips a disabled item', async () => {
    const toolbar = await mount(`
      <mp-quick-access-toolbar>
        <mp-ribbon-button item-id="a" label="A"></mp-ribbon-button>
        <mp-ribbon-button item-id="b" label="B" disabled></mp-ribbon-button>
        <mp-ribbon-button item-id="c" label="C"></mp-ribbon-button>
      </mp-quick-access-toolbar>`);
    const [a, , c] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(a, 'ArrowRight');
    expect(focused).toEqual([c]);
  });

  it('ignores a slotted element that is not a ribbon item', async () => {
    const toolbar = await mount(`
      <mp-quick-access-toolbar>
        <mp-ribbon-button item-id="a" label="A"></mp-ribbon-button>
        <span id="decoration">|</span>
        <mp-ribbon-button item-id="b" label="B"></mp-ribbon-button>
      </mp-quick-access-toolbar>`);
    const [a, b] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(a, 'ArrowRight');
    expect(focused).toEqual([b]);
  });

  // The Angular wrapper renders `<mp-ribbon-button>` INSIDE its own template,
  // so what gets slotted is `<bs-ribbon-button>` and the focusable element sits
  // one level deeper. Addressing the slotted child directly would find nothing
  // — the same trap that shipped a control collapsed to 0px elsewhere.
  it('drills through a framework wrapper to the real element', async () => {
    const toolbar = await mount(`
      <mp-quick-access-toolbar>
        <bs-ribbon-button><mp-ribbon-button item-id="a" label="A"></mp-ribbon-button></bs-ribbon-button>
        <bs-ribbon-button><mp-ribbon-button item-id="b" label="B"></mp-ribbon-button></bs-ribbon-button>
      </mp-quick-access-toolbar>`);
    const [a, b] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(a, 'ArrowRight');
    expect(focused).toEqual([b]);
  });
});

describe('mp-quick-access-toolbar — RTL', () => {
  async function mountRtl() {
    const toolbar = await mount(THREE);
    toolbar.style.direction = 'rtl';
    return toolbar;
  }

  // Under RTL the visual order is mirrored, so the arrow that moves "forward"
  // is the one pointing the way the row runs.
  it('ArrowLeft moves forward', async () => {
    const toolbar = await mountRtl();
    const [a, b] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(a, 'ArrowLeft');
    expect(focused).toEqual([b]);
  });

  it('ArrowRight moves backward', async () => {
    const toolbar = await mountRtl();
    const [, b, c] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(c, 'ArrowRight');
    expect(focused).toEqual([b]);
  });

  // Home and End are logical, not visual — they must not flip with direction.
  it('Home still means first', async () => {
    const toolbar = await mountRtl();
    const [a, , c] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(c, 'Home');
    expect(focused).toEqual([a]);
  });

  it('End still means last', async () => {
    const toolbar = await mountRtl();
    const [a, , c] = buttons(toolbar);
    const focused = watchFocus(toolbar);
    press(a, 'End');
    expect(focused).toEqual([c]);
  });
});

describe('mp-quick-access-toolbar — teardown', () => {
  it('stops handling keys once removed', async () => {
    const toolbar = await mount(THREE);
    const [a] = buttons(toolbar);
    watchFocus(toolbar);
    toolbar.remove();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    a.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
