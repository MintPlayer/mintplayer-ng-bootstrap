import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mint-tile-manager.element';
import type { MintTile, MintTileManagerElement } from './mint-tile-manager.element';
import type { TileLayoutSnapshot, TileGestureBlocked } from '../types/tile-layout-snapshot';
import type { TilePosition } from '../types/tile-position';

const HOST_WIDTH = 800;
const HOST_HEIGHT = 600;

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

function makePointerEvent(
  type: string,
  init: {
    clientX: number;
    clientY: number;
    pointerId?: number;
    button?: number;
    pointerType?: 'mouse' | 'touch' | 'pen';
  },
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'mouse',
    isPrimary: true,
    button: init.button ?? 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX: init.clientX,
    clientY: init.clientY,
  });
}

function nextRaf(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

const tile = (
  id: string,
  position: TilePosition,
  opts: { disableMove?: boolean; disableResize?: boolean } = {},
): MintTile => ({
  id,
  position,
  disableMove: opts.disableMove ?? false,
  disableResize: opts.disableResize ?? false,
  label: null,
});

const fourTiles: MintTile[] = [
  tile('a', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }),
  tile('b', { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 }),
  tile('c', { colStart: 1, rowStart: 2, colSpan: 1, rowSpan: 1 }),
  tile('d', { colStart: 2, rowStart: 2, colSpan: 1, rowSpan: 1 }),
];

async function mount(setup: (el: MintTileManagerElement) => void): Promise<MintTileManagerElement> {
  const el = document.createElement('mp-tile-manager') as MintTileManagerElement;
  document.body.appendChild(el);
  el.getBoundingClientRect = () => makeRect(0, 0, HOST_WIDTH, HOST_HEIGHT);
  setup(el);
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el;
}

describe('mint-tile-manager — layout rendering', () => {
  let el: MintTileManagerElement;

  afterEach(() => {
    el?.remove();
  });

  it('renders one shell per tiles entry, each with its grid placement inlined', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const shells = el.shadowRoot!.querySelectorAll<HTMLElement>('.tile');
    expect(shells.length).toBe(4);
    const styles = Array.from(shells).map((s) => s.getAttribute('style') ?? '');
    expect(styles[0]).toContain('grid-column: 1 / span 1');
    expect(styles[0]).toContain('grid-row: 1 / span 1');
    expect(styles[1]).toContain('grid-column: 2 / span 1');
    expect(styles[3]).toContain('grid-column: 2 / span 1');
    expect(styles[3]).toContain('grid-row: 2 / span 1');
  });

  it('renders a named slot pair per tile id', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = [tile('weather', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 })];
    });
    const slots = el.shadowRoot!.querySelectorAll<HTMLSlotElement>('slot');
    const names = Array.from(slots).map((s) => s.name).sort();
    expect(names).toEqual(['weather-content', 'weather-header']);
  });

  it('renders resize handles by default; omits them when disableResize is true', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = [
        tile('open', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }),
        tile('locked', { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 }, { disableResize: true }),
      ];
    });
    const open = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="open"]')!;
    const locked = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="locked"]')!;
    expect(open.querySelector('.tile__resize-corner')).toBeTruthy();
    expect(locked.querySelector('.tile__resize-corner')).toBeFalsy();
  });

  it('renders a polite role="status" region (via the shared LiveAnnouncerController)', async () => {
    el = await mount((m) => {
      m.tiles = fourTiles;
      m.columnCount = 2;
    });
    const live = el.shadowRoot!.querySelector('[role="status"]');
    expect(live?.getAttribute('aria-live')).toBe('polite');
  });
});

describe('mint-tile-manager — public API', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  it('captureLayout() returns a fresh array of {id, position} pairs', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const snap = el.captureLayout();
    expect(snap.length).toBe(4);
    expect(snap[0]).toEqual({ id: 'a', position: fourTiles[0].position });
    // Mutating the returned snapshot must not mutate the WC's state.
    snap[0].position.colStart = 99;
    expect(el.tiles[0].position.colStart).toBe(1);
  });

  it('isGestureActive is false outside a gesture', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    expect(el.isGestureActive).toBe(false);
  });
});

describe('mint-tile-manager — pointerdown rejection paths', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  function pointerdownOnHeader(target: HTMLElement, init: { button?: number; pointerType?: 'mouse' | 'touch' | 'pen' } = {}): boolean {
    const events: string[] = [];
    el.addEventListener('tilelayoutchange', () => events.push('layout'));
    el.addEventListener('tilepositionchange', () => events.push('position'));

    target.dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50, ...init }));
    // No move / no up — just check immediate state.
    return events.length === 0;
  }

  it('right-click pointerdown is a no-op', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const headerShell = el.shadowRoot!.querySelector<HTMLElement>(
      '.tile[data-tile-id="a"] .tile__header-shell',
    )!;
    expect(pointerdownOnHeader(headerShell, { button: 2 })).toBe(true);
    expect(el.isGestureActive).toBe(false);
  });

  it('dragMode="off" rejects all pointerdown drag arming', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.dragMode = 'off';
      m.tiles = fourTiles;
    });
    const headerShell = el.shadowRoot!.querySelector<HTMLElement>(
      '.tile[data-tile-id="a"] .tile__header-shell',
    )!;
    expect(pointerdownOnHeader(headerShell)).toBe(true);
    expect(el.isGestureActive).toBe(false);
  });

  it('disableMove rejects pointerdown on the locked tile', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = [
        tile('a', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }, { disableMove: true }),
        tile('b', { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 }),
      ];
    });
    const headerShell = el.shadowRoot!.querySelector<HTMLElement>(
      '.tile[data-tile-id="a"] .tile__header-shell',
    )!;
    expect(pointerdownOnHeader(headerShell)).toBe(true);
    expect(el.isGestureActive).toBe(false);
  });
});

describe('mint-tile-manager — touch long-press arming', () => {
  let el: MintTileManagerElement;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    el?.remove();
  });

  it('does not arm a drag immediately on touch pointerdown', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const headerShell = el.shadowRoot!.querySelector<HTMLElement>(
      '.tile[data-tile-id="a"] .tile__header-shell',
    )!;

    headerShell.dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50, pointerType: 'touch' }));
    // Past the 150 ms feedback timer but well before the 600 ms arm timer.
    vi.advanceTimersByTime(200);
    expect(el.isGestureActive).toBe(false);
  });

  it('cancels the long-press timer if the finger moves > 10 px before 600 ms', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const headerShell = el.shadowRoot!.querySelector<HTMLElement>(
      '.tile[data-tile-id="a"] .tile__header-shell',
    )!;

    headerShell.dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50, pointerType: 'touch' }));
    // Move beyond slop before the timer fires.
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 80, clientY: 50, pointerType: 'touch' }));
    vi.advanceTimersByTime(800);
    expect(el.isGestureActive).toBe(false);
  });
});

describe('mint-tile-manager — keyboard mode', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  function focusTile(id: string): HTMLElement {
    const shell = el.shadowRoot!.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
    shell.focus();
    return shell;
  }

  it('Space + ArrowRight on a focused tile fires tilelayoutchange with the new position', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = focusTile('a');
    const events: TileLayoutSnapshot[] = [];
    el.addEventListener('tilelayoutchange', (e) =>
      events.push((e as CustomEvent<TileLayoutSnapshot>).detail),
    );

    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(events.length).toBe(1);
    const aFinal = events[0].find((p) => p.id === 'a')!;
    expect(aFinal.position.colStart).toBe(2);
    expect(aFinal.position.rowStart).toBe(1);
  });

  it('Shift + ArrowDown grows rowSpan by 1 on the focused tile', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = focusTile('a');
    const events: TileLayoutSnapshot[] = [];
    el.addEventListener('tilelayoutchange', (e) =>
      events.push((e as CustomEvent<TileLayoutSnapshot>).detail),
    );

    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }));

    const aFinal = events[0].find((p) => p.id === 'a')!;
    expect(aFinal.position.rowSpan).toBe(2);
  });

  it('Escape exits keyboard-move mode without committing further moves', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = focusTile('a');

    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    // After escape, an arrow key should no longer trigger a move.
    const events: TileLayoutSnapshot[] = [];
    el.addEventListener('tilelayoutchange', (e) =>
      events.push((e as CustomEvent<TileLayoutSnapshot>).detail),
    );
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(events.length).toBe(0);
  });

  it('blocked keyboard move (locked-overlap) does not commit', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = [
        tile('a', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }),
        tile('locked', { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 }, { disableMove: true }),
        tile('c', { colStart: 1, rowStart: 2, colSpan: 1, rowSpan: 1 }, { disableMove: true }),
        tile('d', { colStart: 2, rowStart: 2, colSpan: 1, rowSpan: 1 }, { disableMove: true }),
      ];
    });
    const a = focusTile('a');
    const events: TileLayoutSnapshot[] = [];
    el.addEventListener('tilelayoutchange', (e) =>
      events.push((e as CustomEvent<TileLayoutSnapshot>).detail),
    );

    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    // Moving 'a' onto the locked neighbour with the rest of the grid
    // immovable leaves no valid layout — pack returns blocked.
    expect(events.length).toBe(0);
  });
});

describe('mint-tile-manager — events', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  it('keyboard commit fires tilepositionchange for each moved tile', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    a.focus();
    const positionEvents: { id: string; position: TilePosition }[] = [];
    el.addEventListener('tilepositionchange', (e) =>
      positionEvents.push((e as CustomEvent<{ id: string; position: TilePosition }>).detail),
    );

    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    // At minimum the moved tile (a) gets a position event.
    expect(positionEvents.some((p) => p.id === 'a')).toBe(true);
  });

  it('cancelGesture path emits no tilelayoutchange when there is no in-flight gesture', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const events: TileLayoutSnapshot[] = [];
    el.addEventListener('tilelayoutchange', (e) =>
      events.push((e as CustomEvent<TileLayoutSnapshot>).detail),
    );
    // Escape with no gesture in flight should be silent.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(events.length).toBe(0);
  });
});

describe('mint-tile-manager — resize animation', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  // The data-resizing SCSS rule transitions width/height; without inline pixel
  // dimensions on the active tile, those properties have no animatable values
  // and the tile would snap. JSDOM does not populate getComputedStyle on the
  // shadow grid, so we seed cellMetrics to drive the calculation
  // deterministically.
  function seedCellMetrics(host: MintTileManagerElement): void {
    (host as unknown as {
      cellMetrics: { width: number; height: number; gapX: number; gapY: number };
    }).cellMetrics = { width: 100, height: 80, gapX: 8, gapY: 8 };
  }

  it('inlines width/height on the active tile during a pointer-resize gesture', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.resizeMode = 'always';
      m.tiles = [
        tile('a', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }),
        tile('b', { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 }),
      ];
    });
    seedCellMetrics(el);

    const corner = el.shadowRoot!.querySelector<HTMLElement>(
      '.tile[data-tile-id="a"] .tile__resize-corner',
    )!;
    corner.dispatchEvent(makePointerEvent('pointerdown', { clientX: 100, clientY: 80 }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    expect(a.dataset['resizing']).toBe('true');
    const style = a.getAttribute('style') ?? '';
    // 1×1 tile @ 100×80 cell, no gap contribution at span=1.
    expect(style).toContain('width: 100px');
    expect(style).toContain('height: 80px');
  });

  it('inlined size grows with the spans the gesture is targeting', async () => {
    el = await mount((m) => {
      m.columnCount = 4;
      m.resizeMode = 'always';
      m.tiles = [
        tile('a', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }),
      ];
    });
    seedCellMetrics(el);

    const corner = el.shadowRoot!.querySelector<HTMLElement>(
      '.tile[data-tile-id="a"] .tile__resize-corner',
    )!;
    corner.dispatchEvent(makePointerEvent('pointerdown', { clientX: 100, clientY: 80 }));
    // Drag far enough to bump colSpan to 2 and rowSpan to 2 (cell+gap = 108×88).
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 100 + 108, clientY: 80 + 88 }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    const style = a.getAttribute('style') ?? '';
    // colSpan=2 → 2*100 + 1*8 = 208; rowSpan=2 → 2*80 + 1*8 = 168.
    expect(style).toContain('width: 208px');
    expect(style).toContain('height: 168px');
  });

  it('clears inline width/height when the gesture commits', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.resizeMode = 'always';
      m.tiles = [
        tile('a', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }),
        tile('b', { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 }),
      ];
    });
    seedCellMetrics(el);

    const corner = el.shadowRoot!.querySelector<HTMLElement>(
      '.tile[data-tile-id="a"] .tile__resize-corner',
    )!;
    corner.dispatchEvent(makePointerEvent('pointerdown', { clientX: 100, clientY: 80 }));
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: 100, clientY: 80 }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    expect(a.dataset['resizing']).toBe('false');
    const style = a.getAttribute('style') ?? '';
    expect(style).not.toContain('width:');
    expect(style).not.toContain('height:');
  });
});

// ---------------------------------------------------------------------------
// Pointer gesture lifecycle. jsdom lays nothing out, so every rect is 0x0 and
// the cached cell metrics are zero — these suites deliberately do NOT fake
// geometry (the snapping maths is pinned by utils/grid-geometry.spec.ts).
// They assert the gesture state machine: arming, activation, cancellation and
// cleanup, which run the same way whatever the cell size is.
// ---------------------------------------------------------------------------

function headerOf(host: MintTileManagerElement, id: string): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"] .tile__header-shell`)!;
}

function tileEl(host: MintTileManagerElement, id: string): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
}

function liveText(host: MintTileManagerElement): string {
  return host.shadowRoot!.querySelector('[role="status"]')?.textContent ?? '';
}

async function settle(host: MintTileManagerElement): Promise<void> {
  await (host as unknown as { updateComplete: Promise<void> }).updateComplete;
}

/** Mouse pointerdown on a tile header, then a move past the 5 px threshold. */
function startMouseDrag(host: MintTileManagerElement, id: string, pointerId = 1): void {
  headerOf(host, id).dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50, pointerId }));
  window.dispatchEvent(makePointerEvent('pointermove', { clientX: 70, clientY: 50, pointerId }));
}

function recordEvents(host: MintTileManagerElement): string[] {
  const events: string[] = [];
  host.addEventListener('tilelayoutchange', () => events.push('layout'));
  host.addEventListener('tilepositionchange', () => events.push('position'));
  host.addEventListener('tilegestureblocked', () => events.push('blocked'));
  return events;
}

describe('mint-tile-manager — mouse drag lifecycle', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  const mountFour = () =>
    mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });

  it('does not arm a drag until the pointer travels 5 px', async () => {
    el = await mountFour();
    headerOf(el, 'a').dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50 }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 53, clientY: 52 }));
    expect(el.isGestureActive).toBe(false);
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 55, clientY: 50 }));
    expect(el.isGestureActive).toBe(true);
  });

  it('ignores moves from another pointer while arming', async () => {
    el = await mountFour();
    headerOf(el, 'a').dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 200, clientY: 50, pointerId: 2 }));
    expect(el.isGestureActive).toBe(false);
  });

  it('a pointerup below the threshold disarms: a later move no longer starts a drag', async () => {
    el = await mountFour();
    headerOf(el, 'a').dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50 }));
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: 50, clientY: 50 }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 120, clientY: 50 }));
    expect(el.isGestureActive).toBe(false);
  });

  it('a pointerup from another pointer does not disarm', async () => {
    el = await mountFour();
    headerOf(el, 'a').dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 }));
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: 50, clientY: 50, pointerId: 2 }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 120, clientY: 50, pointerId: 1 }));
    expect(el.isGestureActive).toBe(true);
  });

  it('marks the dragged tile and announces the drag', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a');
    await settle(el);
    expect(tileEl(el, 'a').dataset['dragging']).toBe('true');
    expect(tileEl(el, 'b').dataset['dragging']).toBe('false');
    expect(liveText(el)).toContain('Dragging tile at row 1, column 1.');
  });

  it('announces a labelled tile by its label', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = [{ id: 'w', label: 'Weather', position: { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 } }];
    });
    startMouseDrag(el, 'w');
    await settle(el);
    expect(liveText(el)).toContain('Dragging Weather.');
  });

  it('never renders a NaN grid placement when the grid has no measurable cell size', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a');
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 400, clientY: 300 }));
    await settle(el);
    const styles = Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.tile')).map(
      (t) => t.getAttribute('style') ?? '',
    );
    expect(styles.join('|')).not.toContain('NaN');
  });

  it('a pointerup with no resolvable target cell commits nothing and keeps the layout', async () => {
    el = await mountFour();
    const events = recordEvents(el);
    startMouseDrag(el, 'a');
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 400, clientY: 300 }));
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: 400, clientY: 300 }));
    await settle(el);
    expect(events).toEqual([]);
    expect(el.isGestureActive).toBe(false);
    expect(el.captureLayout()).toEqual(fourTiles.map((t) => ({ id: t.id, position: t.position })));
    expect(tileEl(el, 'a').dataset['dragging']).toBe('false');
  });

  it('ignores the pointerup of a different pointer mid-drag', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a', 1);
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: 70, clientY: 50, pointerId: 2 }));
    expect(el.isGestureActive).toBe(true);
  });

  it('Escape cancels an in-flight drag without emitting layout events', async () => {
    el = await mountFour();
    const events = recordEvents(el);
    startMouseDrag(el, 'a');
    const esc = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(esc);
    await settle(el);
    expect(esc.defaultPrevented).toBe(true);
    expect(el.isGestureActive).toBe(false);
    expect(events).toEqual([]);
    expect(tileEl(el, 'a').dataset['dragging']).toBe('false');
  });

  it('other keys do not cancel a drag', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    expect(el.isGestureActive).toBe(true);
  });

  it('pointercancel ends the drag; one from another pointer does not', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a', 1);
    window.dispatchEvent(makePointerEvent('pointercancel', { clientX: 0, clientY: 0, pointerId: 2 }));
    expect(el.isGestureActive).toBe(true);
    window.dispatchEvent(makePointerEvent('pointercancel', { clientX: 0, clientY: 0, pointerId: 1 }));
    expect(el.isGestureActive).toBe(false);
  });

  it('the page becoming hidden cancels the drag', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a');
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      document.dispatchEvent(new Event('visibilitychange'));
    } finally {
      spy.mockRestore();
    }
    expect(el.isGestureActive).toBe(false);
  });

  it('the page becoming visible again leaves a drag alone', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(el.isGestureActive).toBe(true);
  });

  it('a second pointerdown while a drag is in flight is ignored', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a');
    headerOf(el, 'b').dispatchEvent(makePointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 2 }));
    await settle(el);
    expect(tileEl(el, 'a').dataset['dragging']).toBe('true');
    expect(tileEl(el, 'b').dataset['dragging']).toBe('false');
  });

  it('removing the element mid-drag cancels it and detaches the window listeners', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    el.remove();
    const removed = removeSpy.mock.calls.map((c) => c[0]);
    removeSpy.mockRestore();
    expect(el.isGestureActive).toBe(false);
    expect(removed).toEqual(expect.arrayContaining(['pointermove', 'pointerup', 'pointercancel', 'keydown']));
  });

  it('a tile removed from `tiles` mid-drag ends the gesture on the next move', async () => {
    el = await mountFour();
    startMouseDrag(el, 'a');
    el.tiles = fourTiles.filter((t) => t.id !== 'a');
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 90, clientY: 50 }));
    expect(el.isGestureActive).toBe(false);
  });
});

describe('mint-tile-manager — drag surface by drag-mode', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  function contentOf(host: MintTileManagerElement, id: string): HTMLElement {
    return host.shadowRoot!.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"] .tile__content-shell`)!;
  }

  it('drag-mode="header" does not start a drag from the tile body', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    contentOf(el, 'a').dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50 }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 90, clientY: 50 }));
    expect(el.isGestureActive).toBe(false);
  });

  it('drag-mode="tile" starts a mouse drag from anywhere on the tile', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.dragMode = 'tile';
      m.tiles = fourTiles;
    });
    contentOf(el, 'a').dispatchEvent(makePointerEvent('pointerdown', { clientX: 50, clientY: 50 }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 90, clientY: 50 }));
    expect(el.isGestureActive).toBe(true);
  });

  it('drag-mode="tile" still requires the header for touch, so the body can scroll', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      el = await mount((m) => {
        m.columnCount = 2;
        m.dragMode = 'tile';
        m.tiles = fourTiles;
      });
      contentOf(el, 'a').dispatchEvent(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50, pointerType: 'touch' }),
      );
      vi.advanceTimersByTime(700);
      expect(el.isGestureActive).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('mint-tile-manager — touch long-press drag', () => {
  let el: MintTileManagerElement;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    el?.remove();
  });

  const mountFour = () =>
    mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });

  const touchDown = (host: MintTileManagerElement, id: string, pointerId = 7) =>
    headerOf(host, id).dispatchEvent(
      makePointerEvent('pointerdown', { clientX: 50, clientY: 50, pointerType: 'touch', pointerId }),
    );

  it('shows press feedback on the held tile while arming', async () => {
    el = await mountFour();
    touchDown(el, 'a');
    vi.advanceTimersByTime(200);
    await settle(el);
    expect(tileEl(el, 'a').dataset['pressing']).toBe('true');
    expect(tileEl(el, 'b').dataset['pressing']).toBe('false');
  });

  it('arms a drag after the 600 ms hold, vibrating once', async () => {
    const vibrate = vi.fn();
    const nav = navigator as Navigator & { vibrate?: (p: number) => boolean };
    const original = nav.vibrate;
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
    try {
      el = await mountFour();
      touchDown(el, 'a');
      vi.advanceTimersByTime(600);
      await settle(el);
      expect(el.isGestureActive).toBe(true);
      expect(vibrate).toHaveBeenCalledWith(10);
      expect(tileEl(el, 'a').dataset['dragging']).toBe('true');
      expect(tileEl(el, 'a').dataset['pressing']).toBe('false');
      expect(liveText(el)).toContain('Dragging tile at row 1, column 1.');
    } finally {
      Object.defineProperty(navigator, 'vibrate', { value: original, configurable: true, writable: true });
    }
  });

  it('still arms when navigator.vibrate throws', async () => {
    const original = (navigator as Navigator & { vibrate?: unknown }).vibrate;
    Object.defineProperty(navigator, 'vibrate', {
      value: () => {
        throw new Error('blocked');
      },
      configurable: true,
      writable: true,
    });
    try {
      el = await mountFour();
      touchDown(el, 'a');
      vi.advanceTimersByTime(600);
      expect(el.isGestureActive).toBe(true);
    } finally {
      Object.defineProperty(navigator, 'vibrate', { value: original, configurable: true, writable: true });
    }
  });

  it('lifting the finger before 600 ms cancels the hold', async () => {
    el = await mountFour();
    touchDown(el, 'a');
    vi.advanceTimersByTime(300);
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: 50, clientY: 50, pointerType: 'touch', pointerId: 7 }));
    vi.advanceTimersByTime(600);
    await settle(el);
    expect(el.isGestureActive).toBe(false);
    expect(tileEl(el, 'a').dataset['pressing']).toBe('false');
  });

  it('a pointercancel during the hold cancels it', async () => {
    el = await mountFour();
    touchDown(el, 'a');
    window.dispatchEvent(
      makePointerEvent('pointercancel', { clientX: 50, clientY: 50, pointerType: 'touch', pointerId: 7 }),
    );
    vi.advanceTimersByTime(700);
    expect(el.isGestureActive).toBe(false);
  });

  it('small finger jitter within the 10 px slop keeps the hold alive', async () => {
    el = await mountFour();
    touchDown(el, 'a');
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 55, clientY: 54, pointerType: 'touch', pointerId: 7 }));
    vi.advanceTimersByTime(600);
    expect(el.isGestureActive).toBe(true);
  });

  it('events from another finger do not disturb the hold', async () => {
    el = await mountFour();
    touchDown(el, 'a', 7);
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 300, clientY: 50, pointerType: 'touch', pointerId: 8 }));
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: 300, clientY: 50, pointerType: 'touch', pointerId: 8 }));
    vi.advanceTimersByTime(600);
    expect(el.isGestureActive).toBe(true);
  });

  it('the page becoming hidden during the hold cancels it', async () => {
    el = await mountFour();
    touchDown(el, 'a');
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      document.dispatchEvent(new Event('visibilitychange'));
    } finally {
      spy.mockRestore();
    }
    vi.advanceTimersByTime(700);
    await settle(el);
    expect(el.isGestureActive).toBe(false);
    expect(tileEl(el, 'a').dataset['pressing']).toBe('false');
  });

  it('a touch drag armed by the hold ends on pointerup without committing an unresolved target', async () => {
    el = await mountFour();
    const events = recordEvents(el);
    touchDown(el, 'a');
    vi.advanceTimersByTime(600);
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: 50, clientY: 50, pointerType: 'touch', pointerId: 7 }));
    expect(el.isGestureActive).toBe(false);
    expect(events).toEqual([]);
  });
});

describe('mint-tile-manager — pointer resize lifecycle', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  const handleOf = (host: MintTileManagerElement, id: string, which: 'side' | 'bottom' | 'corner') =>
    host.shadowRoot!.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"] .tile__resize-${which}`)!;

  const mountFour = () =>
    mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });

  it.each(['side', 'bottom', 'corner'] as const)('the %s handle starts a resize and announces it', async (which) => {
    el = await mountFour();
    handleOf(el, 'a', which).dispatchEvent(makePointerEvent('pointerdown', { clientX: 10, clientY: 10 }));
    await settle(el);
    expect(el.isGestureActive).toBe(true);
    expect(tileEl(el, 'a').dataset['resizing']).toBe('true');
    expect(liveText(el)).toContain('Resizing tile at row 1, column 1.');
  });

  it('a resize-handle pointerdown does not also arm a drag of the tile', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.dragMode = 'tile';
      m.tiles = fourTiles;
    });
    handleOf(el, 'a', 'corner').dispatchEvent(makePointerEvent('pointerdown', { clientX: 10, clientY: 10 }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 60, clientY: 10 }));
    await settle(el);
    expect(tileEl(el, 'a').dataset['dragging']).toBe('false');
    expect(tileEl(el, 'a').dataset['resizing']).toBe('true');
  });

  it('a right-button pointerdown on a handle is ignored', async () => {
    el = await mountFour();
    handleOf(el, 'a', 'corner').dispatchEvent(makePointerEvent('pointerdown', { clientX: 10, clientY: 10, button: 2 }));
    expect(el.isGestureActive).toBe(false);
  });

  it('resize-mode="off" removes the handles', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.resizeMode = 'off';
      m.tiles = fourTiles;
    });
    expect(el.shadowRoot!.querySelector('.tile__resize-corner')).toBeNull();
  });

  it('a second handle pointerdown while resizing is ignored', async () => {
    el = await mountFour();
    handleOf(el, 'a', 'corner').dispatchEvent(makePointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }));
    handleOf(el, 'b', 'corner').dispatchEvent(makePointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 2 }));
    await settle(el);
    expect(tileEl(el, 'a').dataset['resizing']).toBe('true');
    expect(tileEl(el, 'b').dataset['resizing']).toBe('false');
  });

  it('never renders a NaN span when the grid has no measurable cell size', async () => {
    el = await mountFour();
    handleOf(el, 'a', 'corner').dispatchEvent(makePointerEvent('pointerdown', { clientX: 10, clientY: 10 }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: 300, clientY: 300 }));
    await settle(el);
    expect(tileEl(el, 'a').getAttribute('style') ?? '').not.toContain('NaN');
  });

  it('Escape cancels a resize', async () => {
    el = await mountFour();
    const events = recordEvents(el);
    handleOf(el, 'a', 'side').dispatchEvent(makePointerEvent('pointerdown', { clientX: 10, clientY: 10 }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(el.isGestureActive).toBe(false);
    expect(events).toEqual([]);
  });
});

describe('mint-tile-manager — attributes and layout cache', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  it.each([
    [null, false],
    ['', true],
    ['true', true],
    ['false', false],
    ['0', false],
  ])('animate-reflow=%j sets animateReflow to %s', async (value, expected) => {
    el = await mount((m) => {
      m.tiles = fourTiles;
    });
    el.setAttribute('animate-reflow', 'true');
    if (value === null) el.removeAttribute('animate-reflow');
    else el.setAttribute('animate-reflow', value);
    expect(el.animateReflow).toBe(expected);
  });

  it('without a column count the grid uses auto-fit tracks of min-column-width', async () => {
    el = await mount((m) => {
      m.minColumnWidth = '150px';
      m.minRowHeight = '6rem';
      m.gap = '1rem';
      m.tiles = fourTiles;
    });
    const style = el.shadowRoot!.querySelector<HTMLElement>('.tile-grid')!.getAttribute('style') ?? '';
    expect(style).toContain('repeat(auto-fit, minmax(150px, 1fr))');
    expect(style).toContain('--mp-tile-row-height: 6rem');
    expect(style).toContain('--mp-tile-gap: 1rem');
  });

  it('a column count renders that many equal tracks', async () => {
    el = await mount((m) => {
      m.columnCount = 3;
      m.tiles = fourTiles;
    });
    const style = el.shadowRoot!.querySelector<HTMLElement>('.tile-grid')!.getAttribute('style') ?? '';
    expect(style).toContain('repeat(3, minmax(0, 1fr))');
  });

  it('keyboard moves clamp to the current column count after it changes', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = [tile('a', { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 })];
    });
    const a = tileEl(el, 'a');
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(el.tiles[0].position.colStart).toBe(2);
    el.columnCount = 3;
    await settle(el);
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(el.tiles[0].position.colStart).toBe(3);
  });
});

describe('mint-tile-manager — host ResizeObserver', () => {
  let el: MintTileManagerElement;
  const original = globalThis.ResizeObserver;
  let observers: { cb: ResizeObserverCallback; targets: Element[]; disconnected: boolean }[] = [];

  beforeEach(() => {
    observers = [];
    globalThis.ResizeObserver = class {
      private readonly rec: { cb: ResizeObserverCallback; targets: Element[]; disconnected: boolean };
      constructor(cb: ResizeObserverCallback) {
        this.rec = { cb, targets: [], disconnected: false };
        observers.push(this.rec);
      }
      observe(target: Element): void {
        this.rec.targets.push(target);
      }
      unobserve(): void {
        /* not used by the element */
      }
      disconnect(): void {
        this.rec.disconnected = true;
      }
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = original;
    el?.remove();
  });

  const tick = () => observers.at(-1)!.cb([], {} as ResizeObserver);

  it('observes the host itself', async () => {
    el = await mount((m) => {
      m.tiles = fourTiles;
    });
    expect(observers.at(-1)!.targets).toEqual([el]);
  });

  it('coalesces observer ticks into one layout refresh per frame', async () => {
    el = await mount((m) => {
      m.tiles = fourTiles;
    });
    const refresh = vi.spyOn(el as unknown as { updateLayoutCache: () => void }, 'updateLayoutCache');
    tick();
    tick();
    tick();
    expect(refresh).not.toHaveBeenCalled();
    await nextRaf();
    expect(refresh).toHaveBeenCalledTimes(1);
    tick();
    await nextRaf();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('disconnects the observer when the element is removed', async () => {
    el = await mount((m) => {
      m.tiles = fourTiles;
    });
    el.remove();
    expect(observers.at(-1)!.disconnected).toBe(true);
  });
});

describe('mint-tile-manager — reflow animation', () => {
  let el: MintTileManagerElement;
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    el?.remove();
  });

  function stubReducedMotion(reduce: boolean): void {
    window.matchMedia = ((query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  /** Keyboard-move tile a down one row (pushes c), counting tile box reads. */
  async function moveTileADownCountingTileReads(): Promise<number> {
    const a = tileEl(el, 'a');
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    await settle(el);
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    try {
      a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      await settle(el);
      return spy.mock.contexts.filter((ctx) => (ctx as Element).classList?.contains('tile')).length;
    } finally {
      spy.mockRestore();
    }
  }

  it('measures every tile around a reflow, and inverts none whose box did not move', async () => {
    stubReducedMotion(false);
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const reads = await moveTileADownCountingTileReads();
    // First and Last of FLIP: each of the 4 tiles before and after the update.
    expect(reads).toBe(8);
    const transforms = ['a', 'b', 'c', 'd'].map((id) => tileEl(el, id).style.transform);
    expect(transforms).toEqual(['', '', '', '']);
  });

  it('honours prefers-reduced-motion by skipping the FLIP pass entirely', async () => {
    stubReducedMotion(true);
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    expect(await moveTileADownCountingTileReads()).toBe(0);
  });

  it('animate-reflow off skips the FLIP pass even when motion is allowed', async () => {
    stubReducedMotion(false);
    el = await mount((m) => {
      m.columnCount = 2;
      m.animateReflow = false;
      m.tiles = fourTiles;
    });
    expect(await moveTileADownCountingTileReads()).toBe(0);
  });
});
