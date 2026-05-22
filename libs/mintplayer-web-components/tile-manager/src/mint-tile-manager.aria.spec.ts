import { afterEach, describe, expect, it } from 'vitest';
import './mint-tile-manager.element';
import type { MintTile, MintTileManagerElement } from './mint-tile-manager.element';
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

const tile = (id: string, position: TilePosition): MintTile => ({
  id,
  position,
  disableMove: false,
  disableResize: false,
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
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  return el;
}

describe('mint-tile-manager — region/button ARIA contract (post-grid retrofit)', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  it('container is role="region" with a fallback aria-label', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const region = el.shadowRoot!.querySelector('.tile-grid')!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe('Tile board');
  });

  it('honours a consumer-provided label over the default', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
      m.label = 'Dashboard tiles';
    });
    const region = el.shadowRoot!.querySelector('.tile-grid')!;
    expect(region.getAttribute('aria-label')).toBe('Dashboard tiles');
  });

  it('does NOT set role="application" or role="row" anywhere (old grid pattern walked back)', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    expect(el.getAttribute('role')).toBeNull();
    expect(el.shadowRoot!.querySelector('[role="row"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[role="gridcell"]')).toBeNull();
  });

  it('each tile is role="button"', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const tiles = el.shadowRoot!.querySelectorAll<HTMLElement>('.tile');
    expect(tiles.length).toBe(4);
    for (const t of Array.from(tiles)) {
      expect(t.getAttribute('role')).toBe('button');
    }
  });

  it('only the focusable tile carries tabindex="0"; others are tabindex="-1"', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const tiles = Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.tile'));
    const tabindexes = tiles.map((t) => t.getAttribute('tabindex'));
    const zeros = tabindexes.filter((v) => v === '0');
    const minusOnes = tabindexes.filter((v) => v === '-1');
    expect(zeros.length).toBe(1);
    expect(minusOnes.length).toBe(3);
  });

  it('region points aria-describedby at a hidden instructions div with the keymap', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const region = el.shadowRoot!.querySelector('.tile-grid')!;
    const describedBy = region.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const instructions = el.shadowRoot!.querySelector(`#${describedBy}`);
    expect(instructions).not.toBeNull();
    expect(instructions!.textContent).toContain('Press M to enter move mode');
  });
});

describe('mint-tile-manager — roving focus + arrow navigation outside move mode', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  function tileEl(id: string): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
  }

  it('ArrowRight on focused tile A moves focus to B (next in row-major order)', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = tileEl('a');
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await Promise.resolve();
    expect(tileEl('b').getAttribute('tabindex')).toBe('0');
  });

  it('Home jumps focus to the first tile in row-major order', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const d = tileEl('d');
    d.focus();
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await Promise.resolve();
    expect(tileEl('a').getAttribute('tabindex')).toBe('0');
  });

  it('End jumps focus to the last tile', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = tileEl('a');
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await Promise.resolve();
    expect(tileEl('d').getAttribute('tabindex')).toBe('0');
  });
});

describe('mint-tile-manager — move mode trigger (Space → M retrofit)', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  it('Space (legacy) no longer enters move mode — must use M', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    // ArrowRight should have moved *focus* (not the tile) since Space didn't enter move mode.
    expect(el.tiles[0].position.colStart).toBe(1);
  });

  it('M enters move mode; the next ArrowRight then commits a position change', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(el.tiles[0].position.colStart).toBe(2);
  });

  it('uppercase M also works', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'M', bubbles: true, cancelable: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(el.tiles[0].position.colStart).toBe(2);
  });
});
