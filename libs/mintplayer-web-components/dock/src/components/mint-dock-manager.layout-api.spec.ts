import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import './mint-dock-manager.element';
import type { MintDockManagerElement } from './mint-dock-manager.element';
import type { DockLayoutNode } from '../types/dock-layout';

/**
 * The dock's public layout surface: the `layout` property, the `layout`
 * attribute, and the snapshot the element hands back.
 *
 * This is the contract a host application actually programs against — an
 * Angular or React wrapper writes a layout in and reads a snapshot out, often
 * two-way — and none of it depends on geometry, so it is fully testable here
 * even though the dragging that produces most layouts is not.
 *
 * Three things carry real risk. The setter **accepts three different shapes**
 * (a bare node, a `DockLayout`, a full snapshot), because a consumer writing a
 * starting layout by hand should not have to know the internal envelope. It
 * **refuses writes during an interaction**, or a two-way binding echoes the
 * layout back mid-drag and snaps the window the user is holding. And getter and
 * setter both **copy**, so a snapshot cannot change under a host that stored
 * it, and a host's own object cannot be mutated by a later drag.
 */

const stack = (...panes: string[]): DockLayoutNode => ({
  kind: 'stack',
  panes,
  activePane: panes[0],
});

const split = (
  direction: 'horizontal' | 'vertical',
  children: DockLayoutNode[],
  sizes?: number[],
): DockLayoutNode => ({ kind: 'split', direction, children, sizes });

const BOUNDS = { left: 10, top: 20, width: 320, height: 240 };

let dock: MintDockManagerElement;

beforeEach(() => {
  dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
  document.body.appendChild(dock);
});

afterEach(() => {
  dock.remove();
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  await (dock as unknown as { updateComplete: Promise<unknown> }).updateComplete;
}

describe('mint-dock-manager — what the layout setter accepts', () => {
  it('takes a bare layout node', () => {
    dock.layout = stack('a') as never;
    expect(dock.layout.root).toMatchObject({ kind: 'stack', panes: ['a'] });
  });

  it('takes a DockLayout envelope', () => {
    dock.layout = { root: stack('a'), titles: { a: 'Alpha' } } as never;
    expect(dock.layout.root).toMatchObject({ panes: ['a'] });
    expect(dock.layout.titles).toEqual({ a: 'Alpha' });
  });

  it('takes a full snapshot', () => {
    dock.layout = { root: stack('a'), floating: [], titles: {} } as never;
    expect(dock.layout.root).toMatchObject({ panes: ['a'] });
  });

  it('takes null as "empty"', () => {
    dock.layout = stack('a') as never;
    dock.layout = null;
    expect(dock.layout.root).toBeNull();
    expect(dock.layout.floating).toEqual([]);
  });

  // A consumer that omits `floating` gets an array rather than undefined, so
  // every reader downstream can iterate without a guard.
  it('always reports floating as an array', () => {
    dock.layout = { root: stack('a') } as never;
    expect(Array.isArray(dock.layout.floating)).toBe(true);
  });

  it('ignores a floating value that is not an array', () => {
    dock.layout = { root: stack('a'), floating: 'nope' } as never;
    expect(dock.layout.floating).toEqual([]);
  });

  it('always reports titles as an object', () => {
    dock.layout = stack('a') as never;
    expect(dock.layout.titles).toEqual({});
  });
});

describe('mint-dock-manager — the snapshot is a copy', () => {
  // A host that stores the snapshot must not watch it change underneath them
  // on the next drag.
  it('hands back a structure that shares nothing with the live layout', () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;

    const first = dock.layout;
    const second = dock.layout;

    expect(second).toEqual(first);
    expect(second.root).not.toBe(first.root);
  });

  it('is not affected by mutating a previous snapshot', () => {
    dock.layout = stack('a') as never;

    const snapshot = dock.layout;
    (snapshot.root as { panes: string[] }).panes.push('injected');

    expect((dock.layout.root as { panes: string[] }).panes).toEqual(['a']);
  });

  // And the reverse: the consumer's own object must survive the dock.
  it('does not keep the object the consumer passed in', () => {
    const mine = { root: stack('a'), floating: [], titles: {} };
    dock.layout = mine as never;

    (dock.layout.root as { panes: string[] }).panes.push('x');

    expect((mine.root as { panes: string[] }).panes).toEqual(['a']);
  });

  it('copies the titles map', () => {
    const titles = { a: 'Alpha' };
    dock.layout = { root: stack('a'), floating: [], titles } as never;

    titles.a = 'changed';

    expect(dock.layout.titles).toEqual({ a: 'Alpha' });
  });

  it('exposes the same snapshot through snapshot and toJSON', () => {
    dock.layout = stack('a') as never;
    expect(dock.snapshot).toEqual(dock.layout);
    expect(dock.toJSON()).toEqual(dock.layout);
  });

  // `toJSON` is what makes `JSON.stringify(dock)` produce a persistable
  // layout, which is how a host saves one to storage.
  it('serialises through JSON.stringify', () => {
    dock.layout = split('vertical', [stack('a'), stack('b')]) as never;
    expect(JSON.parse(JSON.stringify(dock))).toEqual(dock.layout);
  });
});

describe('mint-dock-manager — floating windows on intake', () => {
  it('keeps a well-formed floating window', () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: BOUNDS, root: stack('a') }],
      titles: {},
    } as never;

    expect(dock.layout.floating).toHaveLength(1);
    expect(dock.layout.floating[0].bounds).toEqual(BOUNDS);
  });

  // A window with no usable bounds still has to be reachable, so it gets a
  // default size rather than being dropped or rendered at zero.
  it('supplies default bounds when they are missing', () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ root: stack('a') }],
      titles: {},
    } as never;

    expect(dock.layout.floating[0].bounds).toMatchObject({ left: 0, top: 0 });
    expect(dock.layout.floating[0].bounds.width).toBeGreaterThan(0);
    expect(dock.layout.floating[0].bounds.height).toBeGreaterThan(0);
  });

  it('repairs non-finite bounds', () => {
    dock.layout = {
      root: stack('docked'),
      floating: [
        {
          bounds: { left: Number.NaN, top: Number.NaN, width: Number.NaN, height: Number.NaN },
          root: stack('a'),
        },
      ],
      titles: {},
    } as never;

    const bounds = dock.layout.floating[0].bounds;
    expect(Number.isFinite(bounds.left)).toBe(true);
    expect(Number.isFinite(bounds.width)).toBe(true);
  });

  // Below the floor a window has no grabbable chrome left.
  it('enforces a minimum size', () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: { left: 0, top: 0, width: 1, height: 1 }, root: stack('a') }],
      titles: {},
    } as never;

    expect(dock.layout.floating[0].bounds.width).toBeGreaterThanOrEqual(160);
    expect(dock.layout.floating[0].bounds.height).toBeGreaterThanOrEqual(120);
  });

  it('preserves a consumer z-index', () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: BOUNDS, root: stack('a'), zIndex: 42 }],
      titles: {},
    } as never;

    expect(dock.layout.floating[0].zIndex).toBe(42);
  });
});

describe('mint-dock-manager — the layout attribute', () => {
  it('parses a layout written as an attribute', async () => {
    dock.setAttribute('layout', JSON.stringify({ root: stack('a'), floating: [], titles: {} }));
    await settle();
    expect(dock.layout.root).toMatchObject({ panes: ['a'] });
  });

  it('accepts a bare node in the attribute too', async () => {
    dock.setAttribute('layout', JSON.stringify(stack('a')));
    await settle();
    expect(dock.layout.root).toMatchObject({ panes: ['a'] });
  });

  // Unparseable markup must not take the dock down with it: an empty dock is
  // recoverable, a thrown error during upgrade is not.
  it('warns and empties rather than throwing on malformed JSON', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    dock.layout = stack('a') as never;

    dock.setAttribute('layout', '{not json');
    await settle();

    expect(warn).toHaveBeenCalled();
    expect(dock.layout.root).toBeNull();
  });

  it('empties when the attribute is removed', async () => {
    dock.setAttribute('layout', JSON.stringify(stack('a')));
    await settle();

    dock.removeAttribute('layout');
    await settle();

    expect(dock.layout.root).toBeNull();
  });
});

describe('mint-dock-manager — writes it refuses', () => {
  /*
   * A host doing two-way binding re-feeds every layout the dock dispatches. If
   * that round-trip lands mid-drag it overwrites state the user is still
   * producing — the freshly detached window snaps back to where it was
   * detached and then chases the cursor from there. The dock is the source of
   * truth while a gesture is in flight, and syncs the host at the end.
   */
  it('ignores an external write while a drag is in progress', () => {
    dock.layout = stack('a') as never;
    (dock as unknown as { dragState: unknown }).dragState = { pane: 'a' };

    dock.layout = stack('b') as never;

    expect(dock.layout.root).toMatchObject({ panes: ['a'] });
  });

  it.each(['floatingDragState', 'floatingResizeState', 'cornerResizeState'])(
    'ignores an external write during %s',
    (state) => {
      dock.layout = stack('a') as never;
      (dock as unknown as Record<string, unknown>)[state] = {};

      dock.layout = stack('b') as never;

      expect(dock.layout.root).toMatchObject({ panes: ['a'] });
    },
  );

  it('accepts writes again once the gesture ends', () => {
    dock.layout = stack('a') as never;
    (dock as unknown as { dragState: unknown }).dragState = { pane: 'a' };
    dock.layout = stack('b') as never;

    (dock as unknown as { dragState: unknown }).dragState = null;
    dock.layout = stack('b') as never;

    expect(dock.layout.root).toMatchObject({ panes: ['b'] });
  });

  // Skipping the rebuild for an identical layout is not an optimisation for its
  // own sake: rebuilding the splitter tree flashes an equal-share layout for a
  // frame before the stored sizes are reapplied, on every single drag-end.
  it('does not rebuild for a structurally identical layout', async () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')], [0.3, 0.7]) as never;
    await settle();
    const before = dock.shadowRoot!.querySelector('.dock-split');

    dock.layout = dock.layout;
    await settle();

    expect(dock.shadowRoot!.querySelector('.dock-split')).toBe(before);
  });

  it('does rebuild when the layout actually differs', async () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;
    await settle();
    const before = dock.shadowRoot!.querySelector('.dock-split');

    dock.layout = split('vertical', [stack('a'), stack('c')]) as never;
    await settle();

    expect(dock.shadowRoot!.querySelector('.dock-split')).not.toBe(before);
  });
});

describe('mint-dock-manager — what it renders', () => {
  const stacks = () => dock.shadowRoot!.querySelectorAll('.dock-stack');

  it('renders one stack per stack node', async () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;
    await settle();
    expect(stacks()).toHaveLength(2);
  });

  it('renders a splitter for a split node', async () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;
    await settle();
    expect(dock.shadowRoot!.querySelector('.dock-split')).not.toBeNull();
  });

  it('renders no splitter for a lone stack', async () => {
    dock.layout = stack('a') as never;
    await settle();
    expect(dock.shadowRoot!.querySelector('.dock-split')).toBeNull();
  });

  it('renders a wrapper per floating window', async () => {
    dock.layout = {
      root: stack('docked'),
      floating: [
        { bounds: BOUNDS, root: stack('a') },
        { bounds: BOUNDS, root: stack('b') },
      ],
      titles: {},
    } as never;
    await settle();

    expect(dock.shadowRoot!.querySelectorAll('.dock-floating')).toHaveLength(2);
  });

  it('clears the rendered tree when the layout is emptied', async () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;
    await settle();

    dock.layout = null;
    await settle();

    expect(stacks()).toHaveLength(0);
  });

  it('positions a floating window from its bounds', async () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: BOUNDS, root: stack('a') }],
      titles: {},
    } as never;
    await settle();

    const wrapper = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating')!;
    expect(wrapper.style.width).toBe(`${BOUNDS.width}px`);
    expect(wrapper.style.height).toBe(`${BOUNDS.height}px`);
  });
});
