import { connect, tileManagerIds } from './connect';
import { TileManagerMachine } from './tile-manager-machine';
import type { MintTile, TileLayouts } from './types';

const at = (id: string, colStart: number, rowStart: number, colSpan = 1, rowSpan = 1) => ({ id, position: { colStart, rowStart, colSpan, rowSpan } });
const ids = tileManagerIds('board');

function setup(tiles: MintTile[], layouts: TileLayouts = {}, width: number | null = 400) {
  const machine = new TileManagerMachine();
  machine.setInputs({ tiles, layouts, minColumnWidth: 100, gap: 0 });
  if (width !== null) machine.measure(width);
  return { machine, api: () => connect(machine, 'board') };
}

describe('connect — before the first measure (Tier 2, D14)', () => {
  const { api } = setup([{ id: 'a', label: 'Alpha' }, { id: 'b' }], { 4: [at('a', 1, 1), at('b', 2, 1)] }, null);

  it('writes no position and no track template', () => {
    expect(api().grid.style).toEqual({});
    expect(api().tiles.map((t) => t.style)).toEqual([{}, {}]);
  });

  it('renders inert named groups: no button, no tab stop, no grips, no instructions', () => {
    const [a, b] = api().tiles;
    expect(a.attrs).toMatchObject({ role: 'group', 'aria-label': 'Alpha', tabindex: null, 'aria-pressed': null, 'aria-describedby': null });
    expect(b.attrs).toMatchObject({ role: 'group', 'aria-label': null, 'aria-labelledby': ids.header('b') });
    expect(b.header['id']).toBe(ids.header('b'));
    expect(api().tiles.every((t) => t.grips.length === 0 && t.header['data-drag-handle'] === null)).toBe(true);
    expect(api().descriptions).toEqual([{ key: 'description', attrs: { 'data-mps': 'tile-manager', id: ids.description }, text: 'Read-only.' }]);
  });

  it('scopes the board by the root id and carries the floors as custom properties', () => {
    expect(api().board.attrs).toMatchObject({ id: 'board', role: 'region', 'aria-label': 'Tile board', 'aria-describedby': ids.description });
    expect(api().board.style).toEqual({ '--mp-tile-min-column': '100px', '--mp-tile-gap': '0px', '--mp-tile-row-height': '8rem' });
  });
});

describe('connect — measured', () => {
  it('writes positions in rendered coordinates, in tiles order, with one tab stop', () => {
    const { api } = setup([{ id: 'b' }, { id: 'a' }], { 4: [at('a', 1, 1), at('b', 4, 1)] }, 200);
    const [b, a] = api().tiles;
    expect(api().grid.style).toEqual({ 'grid-template-columns': 'repeat(2, minmax(0, 1fr))' });
    expect(a.id).toBe('a');
    expect(b.style['grid-column']).toBe('2 / span 1');
    expect([a, b].filter((t) => t.attrs['tabindex'] === '0')).toHaveLength(1);
    expect(a.attrs).toMatchObject({ role: 'button', 'aria-roledescription': 'tile', 'aria-pressed': 'false' });
  });

  it('points each tile at its per-capability instructions and renders only the ones in use', () => {
    const { api } = setup([{ id: 'a' }, { id: 'm', disableResize: true }, { id: 'n', disableMove: true, disableResize: true }]);
    const [a, m, n] = api().tiles;
    expect(a.attrs['aria-describedby']).toBe(ids.instructions('both'));
    expect(m.attrs['aria-describedby']).toBe(ids.instructions('move'));
    expect(n.attrs['aria-describedby']).toBe(ids.instructions('none'));
    expect(api().descriptions.map((d) => d.key)).toEqual(['description', 'both', 'move', 'none']);
    expect(api().descriptions.find((d) => d.key === 'none')?.text).toBe('This tile cannot be moved or resized.');
    expect(m.grips).toEqual([]);
    expect(a.grips.map((g) => g.handle)).toEqual(['side', 'bottom', 'corner']);
    expect(a.grips[0].attrs['aria-hidden']).toBe('true');
  });

  it('describes the board by its count, read-only when the modes are off', () => {
    const { machine, api } = setup([{ id: 'a' }]);
    expect(api().descriptions[0].text).toBe('4 columns.');
    machine.setInputs({ dragMode: 'off', resizeMode: 'off' });
    expect(api().descriptions[0].text).toBe('4 columns, read-only.');
    expect(api().tiles[0].header['data-drag-handle']).toBeNull();
    expect(api().tiles[0].grips).toEqual([]);
  });

  it('marks the drag handle per dragMode', () => {
    const { machine, api } = setup([{ id: 'a' }]);
    expect(api().tiles[0].header['data-drag-handle']).toBe(true);
    expect(api().tiles[0].attrs['data-draggable']).toBeNull();
    machine.setInputs({ dragMode: 'tile' });
    expect(api().tiles[0].header['data-drag-handle']).toBeNull();
    expect(api().tiles[0].attrs['data-draggable']).toBe(true);
  });

  it('reflects M and R mode on aria-pressed and data-mode', () => {
    const { machine, api } = setup([{ id: 'a' }, { id: 'b' }]);
    machine.keydown('a', 'm');
    expect(api().tiles[0].attrs).toMatchObject({ 'aria-pressed': 'true', 'data-mode': 'move' });
    expect(api().tiles[1].attrs).toMatchObject({ 'aria-pressed': 'false', 'data-mode': null });
    machine.keydown('a', 'r');
    expect(api().tiles[0].attrs['data-mode']).toBe('resize');
    machine.keydown('a', 'Escape');
    expect(api().tiles[0].attrs['data-mode']).toBeNull();
    expect(api().live).toMatchObject({ attrs: { role: 'status', 'aria-live': 'polite' }, text: 'Change cancelled and reverted.' });
  });

  it('drops a hidden tile from both trees and restores it', () => {
    const { machine, api } = setup([{ id: 'a' }, { id: 'b' }]);
    machine.setInputs({ tiles: [{ id: 'a' }] });
    expect(api().tiles.map((t) => t.id)).toEqual(['a']);
    machine.setInputs({ tiles: [{ id: 'a' }, { id: 'b' }] });
    expect(api().tiles.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('uses the label input and keeps distinct tile ids distinct in IDREFs', () => {
    const { machine, api } = setup([{ id: 'a b' }, { id: 'a_20_b' }]);
    machine.setInputs({ label: 'Sales dashboard' });
    expect(api().board.attrs['aria-label']).toBe('Sales dashboard');
    const [x, y] = api().tiles.map((t) => t.header['id']);
    expect(x).not.toBe(y);
    expect(x).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
