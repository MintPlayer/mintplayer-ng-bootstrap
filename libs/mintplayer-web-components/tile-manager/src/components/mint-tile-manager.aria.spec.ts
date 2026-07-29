import { afterEach, describe, expect, it } from 'vitest';
import './mint-tile-manager.element';
import type { MintTile, MintTileManagerElement } from './mint-tile-manager.element';
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

  it('every TILE points aria-describedby at the hidden instructions div (SRs read it at the focus target)', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    // On the tiles, not the region: the instructions describe what a focused
    // tile can do, and describedby is read where focus lands.
    expect(el.shadowRoot!.querySelector('.tile-grid')!.hasAttribute('aria-describedby')).toBe(false);
    const tiles = [...el.shadowRoot!.querySelectorAll('.tile')];
    const ids = new Set(tiles.map((t) => t.getAttribute('aria-describedby')));
    expect(ids.size).toBe(1);
    const [describedBy] = ids;
    expect(describedBy).toBeTruthy();
    const instructions = el.shadowRoot!.querySelector(`#${describedBy}`);
    expect(instructions!.textContent).toContain('Press M to enter move mode');
  });

  it('aria-pressed IS the move-mode token — flips on M, back on Enter, reactively', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles;
    });
    const tile = () => el.shadowRoot!.querySelector('.tile[data-tile-id="a"]')!;
    expect(tile().getAttribute('aria-pressed')).toBe('false');

    tile().dispatchEvent(new KeyboardEvent('keydown', { key: 'M', bubbles: true, composed: true, cancelable: true }));
    await el.updateComplete;
    expect(tile().getAttribute('aria-pressed')).toBe('true');

    tile().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true }));
    await el.updateComplete;
    expect(tile().getAttribute('aria-pressed')).toBe('false');
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

describe('mint-tile-manager — Escape genuinely reverts move mode (4.10 Critical)', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  const kd = (target: HTMLElement, key: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  it('Escape restores the layout captured at move-mode entry and emits the restore', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles.map((t) => ({ ...t, position: { ...t.position } }));
    });
    const layouts: unknown[] = [];
    el.addEventListener('tilelayoutchange', (e) => layouts.push((e as CustomEvent).detail));

    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    a.focus();
    kd(a, 'm');
    kd(a, 'ArrowRight');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(el.tiles[0].position.colStart).toBe(2); // step already mutated

    kd(a, 'Escape');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    expect(el.tiles[0].position.colStart).toBe(1); // reverted for real
    // Consumers saw the intermediate change AND the restore.
    expect(layouts.length).toBe(2);
    const restored = layouts[1] as { id: string; position: { colStart: number } }[];
    expect(restored.find((p) => p.id === 'a')!.position.colStart).toBe(1);
  });

  it('Enter commits — the stepped layout survives', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles.map((t) => ({ ...t, position: { ...t.position } }));
    });
    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    a.focus();
    kd(a, 'm');
    kd(a, 'ArrowRight');
    kd(a, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(el.tiles[0].position.colStart).toBe(2);
  });

  it('the cancel announcement says reverted', async () => {
    el = await mount((m) => {
      m.columnCount = 2;
      m.tiles = fourTiles.map((t) => ({ ...t, position: { ...t.position } }));
    });
    const a = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-tile-id="a"]')!;
    a.focus();
    kd(a, 'm');
    kd(a, 'Escape');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const live = el.shadowRoot!.querySelector('[aria-live], [role="status"]');
    expect(live?.textContent).toContain('reverted');
  });
});
