import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-tile-manager';
import type { MintTileManagerElement } from './mp-tile-manager';
import type { MintTile, TileLayoutChange } from '@mintplayer/ui-core/tile-manager';
import { tileManagerDomMismatches } from '@mintplayer/ui-core/_conformance/tile-manager-dom';

// Wiring only: inputs reach the machine, the DOM reflects it, events come back out. The
// layout rules themselves are pinned in ui-core's machine and derive specs.

const tiles: MintTile[] = [{ id: 'a' }, { id: 'b' }, { id: 'c', disableResize: true }];

async function mount(setup: (el: MintTileManagerElement) => void = () => undefined): Promise<MintTileManagerElement> {
  const el = document.createElement('mp-tile-manager');
  el.tiles = tiles;
  el.breakpoints = [{ minWidth: 0, columns: 2 }];
  setup(el);
  document.body.appendChild(el);
  await el.updateComplete;
  el.machine.measure(800);
  await el.updateComplete;
  return el;
}

const tile = (el: MintTileManagerElement, id: string) => el.renderRoot.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
const key = async (el: MintTileManagerElement, id: string, k: string) => {
  tile(el, id).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  await el.updateComplete;
};

describe('mp-tile-manager', () => {
  let el: MintTileManagerElement;
  afterEach(() => {
    el?.remove();
    vi.unstubAllGlobals();
  });

  it('renders one header and one content slot per tile, named after its id', async () => {
    el = await mount();
    const names = Array.from(el.renderRoot.querySelectorAll('slot')).map((s) => s.getAttribute('name'));
    expect(names).toEqual(['a-header', 'a-content', 'b-header', 'b-content', 'c-header', 'c-content']);
  });

  it('places tiles from the derived layout and sets the track template once measured', async () => {
    el = await mount();
    const grid = el.renderRoot.querySelector<HTMLElement>('.tile-grid')!;
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(tile(el, 'b').style.gridColumn).toContain('2');
  });

  it('renders exactly the DOM connect() describes (four-front conformance)', async () => {
    el = await mount();
    expect(tileManagerDomMismatches(el.renderRoot, { tiles, breakpoints: [{ minWidth: 0, columns: 2 }] }, 800)).toEqual([]);
  });

  it('renders resize grips only where resizing is allowed', async () => {
    el = await mount();
    expect(tile(el, 'a').querySelectorAll('.tile-grip').length).toBe(3);
    expect(tile(el, 'c').querySelectorAll('.tile-grip').length).toBe(0);
    el.resizeMode = 'off';
    await el.updateComplete;
    expect(el.renderRoot.querySelectorAll('.tile-grip').length).toBe(0);
  });

  it('forwards attributes to the machine', async () => {
    el = await mount();
    el.setAttribute('drag-mode', 'tile');
    el.setAttribute('min-column-width', '150');
    el.setAttribute('gap', '12');
    await el.updateComplete;
    const s = el.machine.snapshot;
    expect([s.dragMode, s.minColumnWidth, s.gap]).toEqual(['tile', 150, 12]);
    expect(tile(el, 'a').hasAttribute('data-draggable')).toBe(true);
  });

  it('re-dispatches a keyboard commit as layoutchange with the full layouts record', async () => {
    el = await mount();
    const changes: TileLayoutChange[] = [];
    el.addEventListener('layoutchange', (e) => changes.push((e as CustomEvent<TileLayoutChange>).detail));
    await key(el, 'a', 'm');
    await key(el, 'a', 'ArrowDown');
    await key(el, 'a', 'Enter');
    expect(changes).toHaveLength(1);
    expect(changes[0].columnCount).toBe(2);
    expect(changes[0].layouts[2]).toEqual(changes[0].layout);
  });

  it('emits layoutpreview for each keyboard step', async () => {
    el = await mount();
    const previews = vi.fn();
    el.addEventListener('layoutpreview', previews);
    await key(el, 'a', 'm');
    await key(el, 'a', 'ArrowDown');
    expect(previews).toHaveBeenCalled();
  });

  it('an unrelated property change does not re-push a stale controlled layouts', async () => {
    el = await mount();
    await key(el, 'a', 'm');
    await key(el, 'a', 'ArrowDown');
    await key(el, 'a', 'Enter');
    const committed = el.captureLayout();
    el.label = 'Board';
    await el.updateComplete;
    expect(el.captureLayout()).toEqual(committed);
  });

  it('captureLayout returns the column count and what is rendered', async () => {
    el = await mount();
    const { columnCount, layout } = el.captureLayout();
    expect(columnCount).toBe(2);
    expect(layout.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('resetLayout drops a stored count and commits', async () => {
    el = await mount((m) => (m.layouts = { 2: [{ id: 'a', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }] }));
    const changes: TileLayoutChange[] = [];
    el.addEventListener('layoutchange', (e) => changes.push((e as CustomEvent<TileLayoutChange>).detail));
    el.resetLayout(2);
    expect(changes.at(-1)?.layouts[2]).toBeUndefined();
  });

  it('measures the grid from a ResizeObserver, in the next frame', async () => {
    let callback: ResizeObserverCallback | null = null;
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: ResizeObserverCallback) {
        callback = cb;
      }
      observe() {}
      disconnect() {}
    });
    el = document.createElement('mp-tile-manager');
    el.tiles = tiles;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.machine.snapshot.measured).toBe(false);
    callback!([{ contentBoxSize: [{ inlineSize: 400 }], contentRect: { width: 400 } } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    expect(el.machine.snapshot.measured).toBe(false);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    expect(el.machine.snapshot.measured).toBe(true);
  });
});
