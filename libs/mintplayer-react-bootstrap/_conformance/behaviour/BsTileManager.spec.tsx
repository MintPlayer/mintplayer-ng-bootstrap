import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import type { MintTile, TileLayoutChange, TileLayouts } from '@mintplayer/ui-core/tile-manager';
import { BsTileManager, type BsTileManagerHandle } from '../../tile-manager/src/BsTileManager';

/**
 * The React front of the headless tile-manager core (#440). Wiring only: props reach the
 * machine, the JSX renders connect()'s bags, events come back out. The layout and ARIA rules
 * themselves are pinned in ui-core's specs.
 */
interface DemoTile extends MintTile {
  title: string;
}

const TILES: DemoTile[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma', disableResize: true },
];

let container: HTMLElement;
let root: Root;
let handle: BsTileManagerHandle | null;
let changes: TileLayoutChange[];
let current: () => TileLayouts;
let setLayouts: (layouts: TileLayouts) => void;
let setDragMode: (mode: 'header' | 'tile' | 'off') => void;

function Host() {
  const [layouts, set] = useState<TileLayouts>({});
  const [dragMode, setMode] = useState<'header' | 'tile' | 'off'>('header');
  current = () => layouts;
  setLayouts = set;
  setDragMode = setMode;
  return (
    <BsTileManager
      ref={(h) => {
        handle = h;
      }}
      aria-label="Dashboard"
      tiles={TILES}
      layouts={layouts}
      onLayoutsChange={set}
      onLayoutChange={(c) => changes.push(c)}
      breakpoints={[{ minWidth: 0, columns: 2 }]}
      dragMode={dragMode}
      renderHeader={(t) => <span className="head">{t.title}</span>}
      renderContent={(t) => <p className="body">{t.id} body</p>}
    />
  );
}

const tile = (id: string) => container.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
const key = async (id: string, k: string) => {
  await act(async () => {
    tile(id).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
};
const machine = () => handle!.captureLayout();

// jsdom has no layout: a fake observer reports the width, and the frame runs at once.
let observed: ((entries: unknown[]) => void) | null;
class FakeResizeObserver {
  constructor(callback: (entries: unknown[]) => void) {
    observed = callback;
  }
  observe() {}
  disconnect() {}
}
const measure = async (width: number) => {
  await act(async () => observed?.([{ contentRect: { width } }]));
};

beforeEach(async () => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  observed = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  changes = [];
  await act(async () => root.render(<Host />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('BsTileManager (React front)', () => {
  it('renders the header and content per tile, with the tile as argument', () => {
    expect([...container.querySelectorAll('.tile-header .head')].map((n) => n.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(tile('b').querySelector('.tile-content .body')?.textContent).toBe('b body');
  });

  it('renders no <mp-tile-manager>: the JSX is the DOM', () => {
    expect(container.querySelector('mp-tile-manager')).toBeNull();
    expect(container.querySelector('.mp-tile-manager[data-mps="tile-manager"]')).not.toBeNull();
  });

  it('a consumer aria-label names the region', () => {
    const board = container.querySelector('.mp-tile-manager')!;
    expect(board.getAttribute('role')).toBe('region');
    expect(board.getAttribute('aria-label')).toBe('Dashboard');
  });

  it('before the first measure: tier 2 groups, no grips, the layout rules inline', () => {
    expect(tile('a').getAttribute('role')).toBe('group');
    expect(tile('a').hasAttribute('tabindex')).toBe(false);
    expect(container.querySelectorAll('.tile-grip')).toHaveLength(0);
    expect(container.querySelector('.mp-tile-manager > style')?.textContent).toContain('[data-tile-id="b"]');
  });

  describe('once measured', () => {
    beforeEach(() => measure(800));

    it('places tiles, sets the track template and drops the inline rules', () => {
      expect(container.querySelector<HTMLElement>('.tile-grid')!.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
      expect(tile('b').style.gridColumn).toContain('2');
      expect(container.querySelector('.mp-tile-manager > style')).toBeNull();
    });

    it('renders resize grips only where resizing is allowed', () => {
      expect(tile('a').querySelectorAll('.tile-grip')).toHaveLength(3);
      expect(tile('c').querySelectorAll('.tile-grip')).toHaveLength(0);
    });

    it('forwards a changed prop to the machine', async () => {
      await act(async () => setDragMode('tile'));
      expect(tile('a').hasAttribute('data-draggable')).toBe(true);
    });

    it('a keyboard commit calls onLayoutsChange and onLayoutChange once', async () => {
      await key('a', 'm');
      await key('a', 'ArrowDown');
      await key('a', 'Enter');
      expect(changes).toHaveLength(1);
      expect(changes[0].columnCount).toBe(2);
      expect(current()).toBe(changes[0].layouts);
    });

    it('an unrelated prop change does not re-push a stale layouts over the commit', async () => {
      await key('a', 'm');
      await key('a', 'ArrowDown');
      await key('a', 'Enter');
      const committed = machine();
      await act(async () => setDragMode('tile'));
      expect(machine()).toEqual(committed);
    });

    it('a consumer write to layouts reaches the machine', async () => {
      await act(async () => setLayouts({ 2: [{ id: 'a', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }] }));
      expect(machine().layout.find((p) => p.id === 'a')?.position.colStart).toBe(2);
    });

    it('arrow keys move focus between tiles', async () => {
      tile('a').focus();
      await key('a', 'ArrowRight');
      expect(document.activeElement).toBe(tile('b'));
      expect(tile('b').getAttribute('tabindex')).toBe('0');
    });
  });
});

describe('BsTileManager under SSR', () => {
  it('renders every tile with its content, no inline position, and the layout rules', () => {
    const html = renderToString(
      <BsTileManager tiles={TILES} stackBelow={600} label="Dashboard" renderHeader={(t) => `${t.title} title`} renderContent={(t) => `${t.id} body`} />,
    );
    expect(html).toMatch(/<div[^>]*role="region"/);
    expect(html).toContain('aria-label="Dashboard"');
    const tiles = html.match(/<div[^>]*class="tile"[^>]*>/g) ?? [];
    expect(tiles).toHaveLength(3);
    expect(tiles.every((t) => t.includes('role="group"') && !t.includes('tabindex') && !t.includes('grid-column'))).toBe(true);
    expect(html).toContain('Beta title');
    expect(html).not.toContain('tile-grip');
    expect(html).toContain('@container (min-width: 600px)');
  });
});
