import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mint-tile-manager.element';
import type { MintTile, MintTileManagerElement } from './mint-tile-manager.element';
import type { TileLayoutSnapshot, TileGestureBlocked } from './types/tile-layout-snapshot';
import type { TilePosition } from './types/tile-position';

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
