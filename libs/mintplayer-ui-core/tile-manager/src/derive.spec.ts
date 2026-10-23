import { deriveLayout, projectDown, staleCounts, withLayout, withoutLayout, withoutNarrowerLayouts } from './derive';
import type { MintTile, TileLayouts, TileLayoutSnapshot } from './types';
import { rectsOverlap } from './types';

const at = (id: string, colStart: number, rowStart: number, colSpan = 1, rowSpan = 1) => ({ id, position: { colStart, rowStart, colSpan, rowSpan } });
const tiles = (...ids: string[]): MintTile[] => ids.map((id) => ({ id }));
const pos = (layout: TileLayoutSnapshot, id: string) => layout.find((e) => e.id === id)!.position;

// A 6-column board: a 3-wide KPI row on top, a 4-wide table and a 2-wide chart below.
const six: TileLayoutSnapshot = [at('kpi', 1, 1, 3), at('note', 4, 1, 3), at('table', 1, 2, 4, 2), at('chart', 5, 2, 2, 2)];
const all = tiles('kpi', 'note', 'table', 'chart');

describe('deriveLayout', () => {
  it('returns the stored layout for an exact match', () => {
    const result = deriveLayout({ 6: six }, all, 6);
    expect(result).toEqual({ layout: six, source: 'stored', from: 6 });
  });

  it('projects down with the plain cap, keeping rowSpan, then packs', () => {
    const { layout, source, from } = deriveLayout({ 6: six }, all, 2);
    expect([source, from]).toEqual(['projected', 6]);
    // 3-wide becomes 2-wide with colStart pulled in; the table keeps its 2 rows.
    expect(pos(layout, 'kpi')).toEqual({ colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 });
    expect(pos(layout, 'note')).toEqual({ colStart: 1, rowStart: 2, colSpan: 2, rowSpan: 1 });
    expect(pos(layout, 'table')).toEqual({ colStart: 1, rowStart: 3, colSpan: 2, rowSpan: 2 });
    expect(pos(layout, 'chart')).toEqual({ colStart: 1, rowStart: 5, colSpan: 2, rowSpan: 2 });
    layout.forEach((a, i) => layout.slice(i + 1).forEach((b) => expect(rectsOverlap(a.position, b.position)).toBe(false)));
  });

  it('cascades: derives from the nearest larger stored count, not the widest', () => {
    const three: TileLayoutSnapshot = [at('chart', 1, 1, 3), at('kpi', 1, 2), at('note', 2, 2), at('table', 3, 2)];
    const result = deriveLayout({ 6: six, 3: three }, all, 2);
    expect(result.from).toBe(3);
    expect(pos(result.layout, 'chart')).toEqual({ colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 });
  });

  it('scales up by edges from the nearest smaller count when nothing larger is stored', () => {
    const { layout, source, from } = deriveLayout({ 3: [at('a', 1, 1), at('b', 2, 1, 2)] }, tiles('a', 'b'), 6);
    expect([source, from]).toEqual(['scaled', 3]);
    expect(pos(layout, 'a')).toEqual({ colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 });
    expect(pos(layout, 'b')).toEqual({ colStart: 3, rowStart: 1, colSpan: 4, rowSpan: 1 });
  });

  it('places every tile from defaultSize in tiles order when nothing is stored', () => {
    const { layout, source } = deriveLayout({}, [{ id: 'a', defaultSize: { colSpan: 2, rowSpan: 1 } }, { id: 'b' }, { id: 'c', defaultSize: { colSpan: 9, rowSpan: 2 } }], 3);
    expect(source).toBe('default');
    expect(layout).toEqual([at('a', 1, 1, 2), at('b', 3, 1), at('c', 1, 2, 3, 2)]);
  });

  it('appends tiles missing from the layout below the last occupied row', () => {
    const { layout } = deriveLayout({ 6: six }, [...all, { id: 'new' }, { id: 'newer', defaultSize: { colSpan: 2, rowSpan: 1 } }], 6);
    expect(pos(layout, 'new')).toEqual({ colStart: 1, rowStart: 4, colSpan: 1, rowSpan: 1 });
    expect(pos(layout, 'newer')).toEqual({ colStart: 2, rowStart: 4, colSpan: 2, rowSpan: 1 });
  });

  it('does not render stored ids that are not in tiles', () => {
    const { layout } = deriveLayout({ 6: six }, tiles('kpi', 'table'), 6);
    expect(layout.map((e) => e.id)).toEqual(['kpi', 'table']);
  });

  it('lists the layout in tiles order', () => {
    expect(deriveLayout({ 6: six }, tiles('chart', 'kpi', 'table', 'note'), 6).layout.map((e) => e.id)).toEqual(['chart', 'kpi', 'table', 'note']);
  });

  it('projects a stored layout that is out of range instead of trusting it', () => {
    const { layout } = deriveLayout({ 2: [at('a', 1, 1), at('b', 4, 1)] }, tiles('a', 'b'), 2);
    expect(pos(layout, 'b')).toEqual({ colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 });
  });

  it('does not mutate its input', () => {
    const layouts: TileLayouts = { 6: six, 3: [at('kpi', 1, 1, 3)] };
    const before = JSON.stringify(layouts);
    [1, 2, 3, 4, 6, 8].forEach((n) => deriveLayout(layouts, all, n));
    expect(JSON.stringify(layouts)).toBe(before);
  });
});

describe('projectDown', () => {
  it('places in reading order, with input index as the tie-break', () => {
    const rows = (layout: TileLayoutSnapshot) => Object.fromEntries(layout.map((e) => [e.id, e.position.rowStart]));
    expect(rows(projectDown([at('b', 2, 1), at('a', 1, 1)], 1))).toEqual({ a: 1, b: 2 });
    expect(rows(projectDown([at('x', 1, 1), at('y', 1, 1)], 1))).toEqual({ x: 1, y: 2 });
  });
});

describe('layouts record helpers', () => {
  const layouts: TileLayouts = { 1: [], 3: [], 6: six };

  it('staleCounts lists stored counts narrower than the edit', () => {
    expect(staleCounts(layouts, 6)).toEqual([1, 3]);
    expect(staleCounts(layouts, 1)).toEqual([]);
  });

  it('withoutNarrowerLayouts drops every count below', () => {
    expect(Object.keys(withoutNarrowerLayouts(layouts, 6))).toEqual(['6']);
  });

  it('withoutLayout drops one count, so it derives again', () => {
    expect(Object.keys(withoutLayout(layouts, 3))).toEqual(['1', '6']);
  });

  it('withLayout passes hidden tiles through, so a re-shown tile returns to its spot', () => {
    const next = withLayout(layouts, 6, [at('kpi', 4, 1, 3)], tiles('kpi'));
    expect(next[6].map((e) => e.id)).toEqual(['kpi', 'note', 'table', 'chart']);
    expect(pos(next[6], 'table')).toEqual(pos(six, 'table'));
    expect(next[3]).toBe(layouts[3]);
  });
});
