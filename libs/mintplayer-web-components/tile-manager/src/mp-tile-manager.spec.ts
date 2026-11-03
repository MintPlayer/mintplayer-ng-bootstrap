import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html, render } from 'lit';
import type { MintTile, TileLayoutChange } from '@mintplayer/ui-core/tile-manager';
import { tileManagerDomMismatches } from '@mintplayer/ui-core/_conformance/tile-manager-dom';
import { MpTileManager } from './index';

void MpTileManager; // force the side-effect registration

/**
 * The generated Lit tile manager (#440, #458 M4). Wiring only: inputs reach the machine,
 * the light-DOM template renders connect()'s bags, events come back out. The layout and
 * ARIA rules themselves are pinned in ui-core's specs.
 */
const TILES: MintTile[] = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }, { id: 'c', disableResize: true }];
const BREAKPOINTS = [{ minWidth: 0, columns: 2 }];

// jsdom has no layout: a fake observer reports the width, and the frame runs at once.
let observed: ((entries: unknown[]) => void) | null;
class FakeResizeObserver {
  constructor(callback: (entries: unknown[]) => void) {
    observed = callback;
  }
  observe() {}
  disconnect() {}
}

let el: MpTileManager;
const tile = (id: string) => el.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
const key = async (id: string, k: string) => {
  tile(id).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  await el.updateComplete;
};

async function mount(setup: (board: MpTileManager) => void = () => undefined): Promise<void> {
  el = document.createElement('mp-tile-manager') as MpTileManager;
  el.tiles = TILES;
  el.breakpoints = BREAKPOINTS;
  el.headerRenderer = ({ tile: t }) => html`<span class="head">${t.label ?? t.id}</span>`;
  el.contentRenderer = ({ tile: t }) => html`<p class="body">${t.id} body</p>`;
  setup(el);
  document.body.appendChild(el);
  await el.updateComplete;
}
async function measure(width: number): Promise<void> {
  observed?.([{ contentRect: { width } }]);
  await el.updateComplete;
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  observed = null;
});

afterEach(() => {
  el?.remove();
  document.head.querySelectorAll('style').forEach((s) => s.remove());
  vi.unstubAllGlobals();
});

describe('mp-tile-manager', () => {
  it('is a light-DOM region host carrying the scope', async () => {
    await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.classList.contains('mp-tile-manager')).toBe(true);
    expect(el.getAttribute('data-mps')).toBe('tile-manager');
    expect(el.getAttribute('role')).toBe('region');
  });

  it('renders the header and content renderers per tile, with the tile as argument', async () => {
    await mount();
    expect([...el.querySelectorAll('.tile-header .head')].map((n) => n.textContent)).toEqual(['Alpha', 'Beta', 'c']);
    expect(tile('b').querySelector('.tile-content .body')?.textContent).toBe('b body');
  });

  it('before the first measure: tier 2 groups, no grips, the layout rules in an instance <style>', async () => {
    await mount();
    expect(tile('a').getAttribute('role')).toBe('group');
    expect(tile('a').hasAttribute('tabindex')).toBe(false);
    expect(el.querySelectorAll('.tile-grip')).toHaveLength(0);
    expect(el.querySelector(':scope > style')?.textContent).toContain('[data-tile-id="b"]');
  });

  describe('once measured', () => {
    beforeEach(async () => {
      await mount();
      await measure(800);
    });

    it('places tiles, sets the track template and drops the layout rules', () => {
      expect(el.querySelector<HTMLElement>('.tile-grid')!.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
      expect(tile('b').style.gridColumn).toContain('2');
      expect(el.querySelector(':scope > style')).toBeNull();
    });

    it('renders exactly the DOM connect() describes (four-front conformance)', () => {
      expect(tileManagerDomMismatches(document.body, { tiles: TILES, breakpoints: BREAKPOINTS }, 800)).toEqual([]);
    });

    it('renders resize grips only where resizing is allowed', async () => {
      expect(tile('a').querySelectorAll('.tile-grip')).toHaveLength(3);
      expect(tile('c').querySelectorAll('.tile-grip')).toHaveLength(0);
      el.resizeMode = 'off';
      await el.updateComplete;
      expect(el.querySelectorAll('.tile-grip')).toHaveLength(0);
    });

    it('a keyboard commit writes layouts back and fires layoutchange once', async () => {
      const changes: TileLayoutChange[] = [];
      el.addEventListener('layoutchange', (e) => changes.push((e as CustomEvent<TileLayoutChange>).detail));
      await key('a', 'm');
      await key('a', 'ArrowDown');
      await key('a', 'Enter');
      expect(changes).toHaveLength(1);
      expect(el.layouts).toBe(changes[0].layouts);
      expect(el.captureLayout().layout.find((p) => p.id === 'a')?.position.rowStart).toBe(2);
    });

    it('a consumer write to layouts reaches the machine', async () => {
      el.layouts = { 2: [{ id: 'a', position: { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 } }] };
      await el.updateComplete;
      expect(el.captureLayout().layout.find((p) => p.id === 'a')?.position.colStart).toBe(2);
    });

    it('arrow keys move focus between tiles', async () => {
      tile('a').focus();
      await key('a', 'ArrowRight');
      await Promise.resolve();
      expect(document.activeElement).toBe(tile('b'));
      expect(tile('b').getAttribute('tabindex')).toBe('0');
    });

    it('a nested board handles only its own tiles', async () => {
      const inner = document.createElement('mp-tile-manager') as MpTileManager;
      inner.tiles = [{ id: 'x' }];
      el.contentRenderer = ({ tile: t }) => (t.id === 'a' ? inner : html`<p>${t.id}</p>`);
      await el.updateComplete;
      await inner.updateComplete;
      inner.querySelector<HTMLElement>('.tile[data-tile-id="x"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
      await el.updateComplete;
      expect(tile('a').hasAttribute('data-mode')).toBe(false);
    });
  });
});

describe('mp-tile-manager rendered by lit-html', () => {
  it('takes property bindings', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(html`<mp-tile-manager .tiles=${TILES} label="Dashboard"></mp-tile-manager>`, host);
    el = host.querySelector('mp-tile-manager') as MpTileManager;
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('Dashboard');
    expect(el.querySelectorAll('.tile')).toHaveLength(3);
    host.remove();
  });
});
