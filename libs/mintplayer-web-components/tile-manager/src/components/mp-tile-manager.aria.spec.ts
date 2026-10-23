import { afterEach, describe, expect, it } from 'vitest';
import './mp-tile-manager';
import type { MintTileManagerElement } from './mp-tile-manager';
import type { MintTile } from '@mintplayer/ui-core/tile-manager';

// The ARIA contract itself is pinned in ui-core's connect.spec.ts; these specs pin that the
// Lit front renders it onto the right nodes and keeps it current.

const tiles: MintTile[] = [{ id: 'a' }, { id: 'b' }, { id: 'c', label: 'Revenue' }, { id: 'd' }];

async function mount(setup: (el: MintTileManagerElement) => void = () => undefined, measure = true): Promise<MintTileManagerElement> {
  const el = document.createElement('mp-tile-manager');
  el.tiles = tiles;
  el.breakpoints = [{ minWidth: 0, columns: 2 }];
  setup(el);
  document.body.appendChild(el);
  await el.updateComplete;
  if (measure) {
    el.machine.measure(800);
    await el.updateComplete;
  }
  return el;
}

const board = (el: MintTileManagerElement) => el.renderRoot.querySelector<HTMLElement>('.mp-tile-manager')!;
const tile = (el: MintTileManagerElement, id: string) => el.renderRoot.querySelector<HTMLElement>(`.tile[data-tile-id="${id}"]`)!;
const allTiles = (el: MintTileManagerElement) => Array.from(el.renderRoot.querySelectorAll<HTMLElement>('.tile'));
const key = async (el: MintTileManagerElement, id: string, k: string) => {
  tile(el, id).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  await el.updateComplete;
};

describe('mp-tile-manager: ARIA', () => {
  let el: MintTileManagerElement;
  afterEach(() => el?.remove());

  it('the board is a named region described by the column count', async () => {
    el = await mount();
    const b = board(el);
    expect(b.getAttribute('role')).toBe('region');
    expect(b.getAttribute('aria-label')).toBe('Tile board');
    const description = el.renderRoot.querySelector(`#${b.getAttribute('aria-describedby')}`);
    expect(description?.textContent).toBe('2 columns.');
  });

  it('a consumer label names the board', async () => {
    el = await mount((m) => (m.label = 'Dashboard'));
    expect(board(el).getAttribute('aria-label')).toBe('Dashboard');
  });

  it('before the first measure, tiles are groups with no tab stop or grips (Tier 2)', async () => {
    el = await mount(undefined, false);
    expect(allTiles(el).map((t) => t.getAttribute('role'))).toEqual(['group', 'group', 'group', 'group']);
    expect(allTiles(el).some((t) => t.hasAttribute('tabindex'))).toBe(false);
    expect(el.renderRoot.querySelectorAll('.tile-grip').length).toBe(0);
  });

  it('after measuring, tiles are buttons with exactly one tab stop', async () => {
    el = await mount();
    expect(allTiles(el).every((t) => t.getAttribute('role') === 'button')).toBe(true);
    expect(allTiles(el).map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
  });

  it('each tile is described by an instruction node inside the same shadow root', async () => {
    el = await mount();
    const ids = tile(el, 'a').getAttribute('aria-describedby')!;
    expect(ids).toBeTruthy();
    expect(el.renderRoot.querySelector(`#${ids}`)?.textContent).toBeTruthy();
  });

  it('a tile is named by its label, or by its header', async () => {
    el = await mount();
    expect(tile(el, 'c').getAttribute('aria-label')).toBe('Revenue');
    const header = tile(el, 'a').getAttribute('aria-labelledby')!;
    expect(el.renderRoot.querySelector(`#${header}`)?.classList.contains('tile-header')).toBe(true);
  });

  it('aria-pressed follows move mode: on with M, off with Enter', async () => {
    el = await mount();
    expect(tile(el, 'a').getAttribute('aria-pressed')).toBe('false');
    await key(el, 'a', 'm');
    expect(tile(el, 'a').getAttribute('aria-pressed')).toBe('true');
    await key(el, 'a', 'Enter');
    expect(tile(el, 'a').getAttribute('aria-pressed')).toBe('false');
  });

  it('arrow keys move focus between tiles and the tab stop follows', async () => {
    el = await mount();
    tile(el, 'a').focus();
    await key(el, 'a', 'ArrowRight');
    expect(el.renderRoot instanceof ShadowRoot && el.renderRoot.activeElement).toBe(tile(el, 'b'));
    expect(tile(el, 'b').getAttribute('tabindex')).toBe('0');
    expect(tile(el, 'a').getAttribute('tabindex')).toBe('-1');
  });

  it('announcements land in the polite live region', async () => {
    el = await mount();
    await key(el, 'a', 'm');
    const live = el.renderRoot.querySelector('[role="status"]')!;
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBeTruthy();
  });
});
