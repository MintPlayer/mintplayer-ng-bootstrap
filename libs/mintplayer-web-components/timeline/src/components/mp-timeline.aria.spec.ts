import { afterEach, describe, expect, it } from 'vitest';
import './mp-timeline';
import type { MpTimeline } from './mp-timeline';
import type { TimelineItem } from '@mintplayer/web-components/timeline-core';

/**
 * ARIA surface of `<mp-timeline>` — the container's role/state and the row
 * semantics it projects onto its items.
 *
 * The container role is deliberately mode-dependent (`list` → `listbox` when
 * selectable, `group` when merely activatable, because a `listitem` may not be
 * interactive), so every role assertion here is paired with the transition that
 * changes it, driven programmatically. Selection and roving tabindex are
 * asserted after a keyboard action AND after a `selectedIds` write.
 *
 * The naming contract itself (`input-label`, host-`aria-label`-wins, no IDREF
 * copying) lives in `_conformance/naming.spec.ts`; what is asserted here is the
 * *live* half of it — the name after the attributes change post-render.
 *
 * jsdom note: the container role is a plain attribute on the `.timeline` node
 * inside the shadow root (the `HostAriaController` here only resolves
 * references), so it is directly observable.
 */
const RELEASES: TimelineItem[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Stable' },
];

async function mount(setup?: (el: MpTimeline) => void): Promise<MpTimeline> {
  const el = document.createElement('mp-timeline') as MpTimeline;
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

async function flush(el: MpTimeline): Promise<void> {
  await el.updateComplete;
  // The roving-focus move and the declarative enhancement both hop a frame.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await el.updateComplete;
}

function list(el: MpTimeline): HTMLElement {
  return el.shadowRoot!.querySelector('.timeline') as HTMLElement;
}

function items(el: MpTimeline): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('mp-timeline-item'));
}

function attrs(els: HTMLElement[], name: string): (string | null)[] {
  return els.map((el) => el.getAttribute(name));
}

async function press(el: MpTimeline, target: HTMLElement, key: string): Promise<void> {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
  await flush(el);
}

describe('mp-timeline ARIA — container role follows the interaction mode', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is an unnamed role="list" with no orientation and no multiselect by default', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
    });
    const container = list(el);
    expect(container.getAttribute('role')).toBe('list');
    // Only widgets take aria-orientation — role=list may not carry it
    // (axe aria-allowed-attr); it appears only in listbox mode.
    expect(container.hasAttribute('aria-orientation')).toBe(false);
    expect(container.hasAttribute('aria-multiselectable')).toBe(false);
    expect(container.hasAttribute('aria-label')).toBe(false);
  });

  it('flips aria-orientation when the orientation changes — listbox mode only', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
      host.selectable = 'single';
    });

    el.orientation = 'horizontal';
    await flush(el);
    expect(list(el).getAttribute('aria-orientation')).toBe('horizontal');

    el.setAttribute('orientation', 'vertical');
    await flush(el);
    expect(list(el).getAttribute('aria-orientation')).toBe('vertical');
  });

  it('becomes a listbox while selectable, and returns to a list when selection is switched off', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
    });
    expect(list(el).getAttribute('role')).toBe('list');

    el.selectable = 'single';
    await flush(el);
    expect(list(el).getAttribute('role')).toBe('listbox');

    el.selectable = 'none';
    await flush(el);
    expect(list(el).getAttribute('role')).toBe('list');
  });

  it('announces aria-multiselectable only in multiple mode', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
      host.selectable = 'multiple';
    });
    expect(list(el).getAttribute('aria-multiselectable')).toBe('true');

    el.selectable = 'single';
    await flush(el);
    expect(list(el).hasAttribute('aria-multiselectable')).toBe(false);
  });

  it('becomes a group of buttons when activatable without selection', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
      host.setAttribute('activatable', '');
    });
    expect(list(el).getAttribute('role')).toBe('group');
    expect(attrs(items(el), 'role')).toEqual(['button', 'button', 'button']);
    // Buttons are not options: no selection state to report.
    expect(items(el).some((it) => it.hasAttribute('aria-selected'))).toBe(false);
  });

  it('keeps the name live across input-label / host aria-label changes, in both directions', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
    });

    el.setAttribute('input-label', 'Release history');
    await flush(el);
    expect(list(el).getAttribute('aria-label')).toBe('Release history');

    el.setAttribute('aria-label', 'From host');
    await flush(el);
    expect(list(el).getAttribute('aria-label')).toBe('From host');

    el.removeAttribute('aria-label');
    await flush(el);
    expect(list(el).getAttribute('aria-label')).toBe('Release history');

    el.removeAttribute('input-label');
    await flush(el);
    expect(list(el).hasAttribute('aria-label')).toBe(false);
  });
});

describe('mp-timeline ARIA — item semantics and selection state', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders plain listitems with no selection state and no tab stops when not interactive', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
    });
    const rows = items(el);
    expect(attrs(rows, 'role')).toEqual(['listitem', 'listitem', 'listitem']);
    expect(rows.some((it) => it.hasAttribute('aria-selected'))).toBe(false);
    expect(rows.some((it) => it.hasAttribute('tabindex'))).toBe(false);
  });

  it('upgrades rows to options with aria-selected="false" and exactly one tab stop', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
      host.selectable = 'single';
    });
    const rows = items(el);
    expect(attrs(rows, 'role')).toEqual(['option', 'option', 'option']);
    expect(attrs(rows, 'aria-selected')).toEqual(['false', 'false', 'false']);
    expect(attrs(rows, 'tabindex')).toEqual(['0', '-1', '-1']);
  });

  it('re-emits aria-selected after a programmatic selectedIds write, and clears it again', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
      host.selectable = 'single';
    });

    el.selectedIds = ['b'];
    await flush(el);
    expect(attrs(items(el), 'aria-selected')).toEqual(['false', 'true', 'false']);

    el.selectedIds = [];
    await flush(el);
    expect(attrs(items(el), 'aria-selected')).toEqual(['false', 'false', 'false']);
  });

  it('re-emits aria-selected after keyboard activation, moving the state off the previous option', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
      host.selectable = 'single';
    });

    await press(el, items(el)[1], 'Enter');
    expect(attrs(items(el), 'aria-selected')).toEqual(['false', 'true', 'false']);

    await press(el, items(el)[2], 'Enter');
    expect(attrs(items(el), 'aria-selected')).toEqual(['false', 'false', 'true']);
  });

  it('moves the single tabindex="0" as the arrows rove, and wraps', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
      host.selectable = 'single';
    });

    await press(el, items(el)[0], 'ArrowDown');
    expect(attrs(items(el), 'tabindex')).toEqual(['-1', '0', '-1']);

    await press(el, items(el)[1], 'End');
    expect(attrs(items(el), 'tabindex')).toEqual(['-1', '-1', '0']);

    // Wrap forward off the last row back onto the first.
    await press(el, items(el)[2], 'ArrowDown');
    expect(attrs(items(el), 'tabindex')).toEqual(['0', '-1', '-1']);
  });

  it('never parks the tab stop on a disabled option', async () => {
    const el = await mount((host) => {
      host.items = [{ id: 'a', title: 'Alpha', disabled: true }, ...RELEASES.slice(1)];
      host.selectable = 'single';
    });
    expect(attrs(items(el), 'tabindex')).toEqual(['-1', '0', '-1']);

    await press(el, items(el)[1], 'Home');
    expect(attrs(items(el), 'tabindex')).toEqual(['-1', '0', '-1']);

    // Activating a disabled row reports no selection either.
    await press(el, items(el)[0], 'Enter');
    expect(items(el)[0].getAttribute('aria-selected')).toBe('false');
  });

  it('strips option state off the rows when selection is switched back off', async () => {
    const el = await mount((host) => {
      host.items = RELEASES;
      host.selectable = 'single';
      host.selectedIds = ['a'];
    });
    expect(items(el)[0].getAttribute('aria-selected')).toBe('true');

    el.selectable = 'none';
    await flush(el);
    const rows = items(el);
    expect(attrs(rows, 'role')).toEqual(['listitem', 'listitem', 'listitem']);
    expect(rows.some((it) => it.hasAttribute('aria-selected'))).toBe(false);
    expect(rows.some((it) => it.hasAttribute('tabindex'))).toBe(false);
  });
});

/**
 * Declarative children are enhanced in place (they stay in the light DOM), so
 * the ARIA lands on the consumer's own elements.
 *
 * Scope note: `lit`'s `isServer` is TRUE under vitest (node export condition),
 * which disables the `updated()` re-enhancement hook and the MutationObserver.
 * What still runs — and is therefore what is asserted here — is `slotchange`
 * (initial assignment) plus the direct re-enhancement inside `applySelection` /
 * `moveFocusTo`. A parent-state flip (`selectable` changing after mount) is
 * covered in data mode above; in declarative mode that path needs a browser.
 */
describe('mp-timeline ARIA — declarative children get the same treatment', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function mountDeclarative(): Promise<MpTimeline> {
    document.body.innerHTML = `
      <mp-timeline selectable="single">
        <mp-timeline-item item-id="a" title="Alpha"></mp-timeline-item>
        <mp-timeline-item item-id="b" title="Beta" selected></mp-timeline-item>
      </mp-timeline>`;
    const el = document.querySelector('mp-timeline') as MpTimeline;
    await flush(el);
    return el;
  }

  function slotted(el: MpTimeline): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('mp-timeline-item'));
  }

  it('makes slotted rows options, seeding aria-selected from the authored selected attribute', async () => {
    const el = await mountDeclarative();
    expect(attrs(slotted(el), 'role')).toEqual(['option', 'option']);
    expect(attrs(slotted(el), 'aria-selected')).toEqual(['false', 'true']);
    expect(attrs(slotted(el), 'tabindex')).toEqual(['0', '-1']);
  });

  it('re-emits aria-selected and moves the tab stop on slotted rows from the keyboard', async () => {
    const el = await mountDeclarative();

    await press(el, slotted(el)[0], 'Enter');
    expect(attrs(slotted(el), 'aria-selected')).toEqual(['true', 'false']);

    await press(el, slotted(el)[0], 'ArrowDown');
    expect(attrs(slotted(el), 'tabindex')).toEqual(['-1', '0']);
  });
});
