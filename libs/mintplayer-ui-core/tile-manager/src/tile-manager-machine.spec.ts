import { TileManagerMachine, type TileManagerEvent, type TilePointer } from './tile-manager-machine';
import type { MintTile, TileLayouts, TileLayoutSnapshot } from './types';

const at = (id: string, colStart: number, rowStart: number, colSpan = 1, rowSpan = 1) => ({ id, position: { colStart, rowStart, colSpan, rowSpan } });
const cell = { width: 100, height: 80, gapX: 0, gapY: 0 };
const mouse = (x: number, y: number, buttons = 1): TilePointer => ({ x, y, pointerId: 1, pointerType: 'mouse', button: 0, buttons });

/** 100 px columns with no gap: the count is floor(width / 100), capped by the map. */
function setup(tiles: MintTile[], layouts: TileLayouts, width: number) {
  const machine = new TileManagerMachine();
  const events: TileManagerEvent[] = [];
  machine.onEvent((e) => events.push(e));
  machine.setInputs({ tiles, layouts, minColumnWidth: 100, gap: 0, dragMode: 'tile' });
  machine.measure(width);
  return { machine, events, of: (type: TileManagerEvent['type']) => events.filter((e) => e.type === type) };
}

const pos = (layout: TileLayoutSnapshot, id: string) => layout.find((e) => e.id === id)?.position;

describe('TileManagerMachine — count and derivation', () => {
  const tiles: MintTile[] = [{ id: 'a' }, { id: 'b' }];
  const four: TileLayouts = { 4: [at('a', 1, 1), at('b', 4, 1)] };

  it('resolves the count on the first measure and emits it with previous null', () => {
    const { machine, of } = setup(tiles, four, 250);
    expect(machine.snapshot.columnCount).toBe(2);
    expect(machine.snapshot.measured).toBe(true);
    expect(of('columncountchange')).toEqual([{ type: 'columncountchange', columnCount: 2, previous: null }]);
  });

  it('changes state only when the resolved count changes', () => {
    const { machine, of } = setup(tiles, four, 250);
    const before = machine.snapshot;
    machine.measure(299);
    expect(machine.snapshot).toBe(before);
    machine.measure(400);
    expect(machine.snapshot.columnCount).toBe(4);
    expect(of('columncountchange').at(-1)).toEqual({ type: 'columncountchange', columnCount: 4, previous: 2 });
  });

  it('renders the projected layout for a narrower count', () => {
    const { machine } = setup(tiles, four, 200);
    expect(pos(machine.snapshot.layout, 'b')).toEqual({ colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 });
  });

  it('freezes the count during a keyboard mode and announces the change on exit', () => {
    const { machine } = setup(tiles, four, 400);
    expect(machine.keydown('a', 'm')).toBe(true);
    machine.measure(200);
    expect(machine.snapshot.columnCount).toBe(4);
    machine.keydown('a', 'Escape');
    expect(machine.snapshot.columnCount).toBe(2);
    expect(machine.snapshot.announcement.text).toBe('Board now has 2 columns.');
  });

  it('does not announce a count change outside a keyboard mode', () => {
    const { machine } = setup(tiles, four, 400);
    const before = machine.snapshot.announcement;
    machine.measure(200);
    expect(machine.snapshot.announcement).toBe(before);
  });
});

describe('TileManagerMachine — gestures use the rendered position', () => {
  // Owner's repro (2026-10-23): a layout authored for 4 columns, rendered at 2, then a drag
  // of the right-hand tile. On master it jumped ~560 px because cellOrigin used the stored column 4.
  it('moves the right-hand tile by the pointer delta at a projected count', () => {
    const { machine } = setup([{ id: 'a' }, { id: 'b' }], { 4: [at('a', 1, 1), at('b', 4, 1)] }, 200);
    expect(machine.pointerDown('b', 'body', mouse(150, 40), cell)).toBe('track');
    expect(machine.pointerMove(mouse(160, 40))).toBe('capture');
    // Still over its rendered column 2: no snap, a translate of the 10 px moved.
    expect(pos(machine.rendered, 'b')).toEqual({ colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1 });
    expect(machine.dragOffset('b')).toEqual({ x: 10, y: 0 });
    machine.pointerMove(mouse(50, 140));
    expect(pos(machine.rendered, 'b')?.colStart).toBe(1);
  });

  // Owner's report (2026-10-23): dragging across locked cells threw the tile ~800 px left at
  // each cell crossing; it must keep following the pointer from its last valid place.
  it('keeps following the pointer over a locked cell', () => {
    const { machine } = setup([{ id: 'a' }, { id: 'lock', disableMove: true }], { 4: [at('a', 1, 1), at('lock', 3, 1, 2)] }, 400);
    machine.pointerDown('a', 'body', mouse(50, 40), cell);
    machine.pointerMove(mouse(150, 40));
    machine.pointerMove(mouse(260, 40));
    expect(machine.snapshot.gesture.kind === 'drag' && machine.snapshot.gesture.blocked).toBe(true);
    expect(pos(machine.rendered, 'a')?.colStart).toBe(2);
    // Rendered at column 2 (origin 100); the pointer's top-left is at 210.
    expect(machine.dragOffset('a')).toEqual({ x: 110, y: 0 });
  });
});

describe('TileManagerMachine — commit and preview', () => {
  const tiles: MintTile[] = [{ id: 'a' }, { id: 'b' }];

  it('stores the commit under the current count, passing hidden ids through', () => {
    const layouts: TileLayouts = { 2: [at('a', 1, 1), at('b', 2, 1), at('hidden', 1, 2)], 1: [at('a', 1, 1), at('b', 1, 2)] };
    const { machine, of } = setup(tiles, layouts, 200);
    machine.keydown('b', 'm');
    machine.keydown('b', 'ArrowDown');
    machine.keydown('b', 'Enter');
    const [change] = of('layoutchange');
    expect(change).toMatchObject({ columnCount: 2, staleCounts: [1] });
    if (change.type !== 'layoutchange') throw new Error();
    expect(change.layout.map((e) => e.id)).toEqual(['a', 'b', 'hidden']);
    expect(pos(change.layouts[2], 'b')).toEqual({ colStart: 2, rowStart: 2, colSpan: 1, rowSpan: 1 });
    expect(machine.snapshot.layouts).toBe(change.layouts);
  });

  it('a commit equal to the entry layout emits nothing (M, then blur)', () => {
    const { machine, of } = setup(tiles, {}, 200);
    machine.keydown('a', 'm');
    machine.blur('a');
    expect(of('layoutchange')).toEqual([]);
    expect(machine.snapshot.keyboard.kind).toBe('idle');
  });

  it('blur commits a keyboard move', () => {
    const { machine, of } = setup(tiles, {}, 200);
    machine.keydown('a', 'm');
    machine.keydown('a', 'ArrowDown');
    machine.blur('a');
    expect(of('layoutchange')).toHaveLength(1);
  });

  it('Escape reverts and re-emits the entry layout as a preview, never a commit', () => {
    const { machine, of } = setup(tiles, {}, 200);
    const entry = machine.snapshot.layout;
    machine.keydown('a', 'm');
    machine.keydown('a', 'ArrowDown');
    machine.keydown('a', 'Escape');
    expect(of('layoutchange')).toEqual([]);
    const last = of('layoutpreview').at(-1);
    expect(last?.type === 'layoutpreview' && last.layout).toEqual(entry);
    expect(machine.rendered).toEqual(entry);
  });

  it('a new layouts object from the host replaces the internal copy', () => {
    const { machine } = setup(tiles, {}, 200);
    machine.keydown('a', 'm');
    machine.keydown('a', 'ArrowDown');
    machine.keydown('a', 'Enter');
    const host: TileLayouts = { 2: [at('a', 2, 1), at('b', 1, 1)] };
    machine.setInputs({ layouts: host });
    expect(machine.snapshot.layouts).toBe(host);
    expect(pos(machine.snapshot.layout, 'a')?.colStart).toBe(2);
  });

  it('resetLayout drops the count and commits, so it derives again', () => {
    const { machine, of } = setup(tiles, { 2: [at('a', 2, 1), at('b', 1, 1)], 4: [at('a', 1, 1), at('b', 2, 1)] }, 200);
    machine.resetLayout(2);
    expect(Object.keys(machine.snapshot.layouts)).toEqual(['4']);
    expect(pos(machine.snapshot.layout, 'a')?.colStart).toBe(1);
    expect(of('layoutchange')).toHaveLength(1);
  });
});

describe('TileManagerMachine — keyboard modes', () => {
  it('R enters resize mode, where plain arrows resize', () => {
    const { machine } = setup([{ id: 'a' }, { id: 'b' }], { 3: [at('a', 1, 1), at('b', 1, 2)] }, 300);
    expect(machine.keydown('a', 'r')).toBe(true);
    expect(machine.snapshot.keyboard.kind).toBe('resize');
    machine.keydown('a', 'ArrowRight');
    expect(pos(machine.rendered, 'a')).toEqual({ colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 });
    expect(machine.snapshot.announcement.text).toBe('2 columns by 1 row.');
  });

  it('R is gated by resizeMode and disableResize', () => {
    const { machine } = setup([{ id: 'a', disableResize: true }, { id: 'b' }], {}, 300);
    machine.keydown('a', 'r');
    expect(machine.snapshot.keyboard.kind).toBe('idle');
    expect(machine.snapshot.announcement.text).toBe('This tile cannot be resized.');
    machine.setInputs({ resizeMode: 'off' });
    machine.keydown('b', 'r');
    expect(machine.snapshot.keyboard.kind).toBe('idle');
  });

  it('a key for a tile that allows neither is not consumed', () => {
    const { machine } = setup([{ id: 'a', disableMove: true, disableResize: true }], {}, 300);
    expect(machine.keydown('a', 'm')).toBe(false);
    expect(machine.keydown('a', 'r')).toBe(false);
  });

  it('switching M and R keeps the entry layout, so Escape reverts both', () => {
    const { machine } = setup([{ id: 'a' }, { id: 'b' }], { 3: [at('a', 1, 1), at('b', 3, 1)] }, 300);
    const entry = machine.snapshot.layout;
    machine.keydown('a', 'm');
    machine.keydown('a', 'ArrowDown');
    machine.keydown('a', 'r');
    expect(machine.snapshot.keyboard.kind).toBe('resize');
    machine.keydown('a', 'ArrowRight');
    machine.keydown('a', 'Escape');
    expect(machine.rendered).toEqual(entry);
  });

  it('Shift+arrow in M mode still resizes', () => {
    const { machine } = setup([{ id: 'a' }], {}, 300);
    machine.keydown('a', 'm');
    machine.keydown('a', 'ArrowDown', { shift: true });
    expect(pos(machine.rendered, 'a')).toEqual({ colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 2 });
  });

  it('dragMode off removes M and the pointer drag', () => {
    const { machine } = setup([{ id: 'a' }], {}, 300);
    machine.setInputs({ dragMode: 'off', resizeMode: 'off' });
    expect(machine.keydown('a', 'm')).toBe(false);
    expect(machine.pointerDown('a', 'header', mouse(10, 10), cell)).toBe('ignore');
  });

  it('turning a mode off mid-move cancels the keyboard mode', () => {
    const { machine, of } = setup([{ id: 'a' }], {}, 300);
    machine.keydown('a', 'm');
    machine.keydown('a', 'ArrowDown');
    machine.setInputs({ dragMode: 'off' });
    expect(machine.snapshot.keyboard.kind).toBe('idle');
    expect(of('layoutchange')).toEqual([]);
  });
});

describe('TileManagerMachine — steps skip past locked tiles', () => {
  // Owner's report (2026-10-23): M + ArrowDown on "Revenue" said "Move blocked." because
  // the locked "Notes" tile sat directly below.
  const tiles: MintTile[] = [{ id: 'revenue' }, { id: 'notes', disableMove: true }];

  it('ArrowDown jumps over a locked tile to the first free cell', () => {
    const { machine } = setup(tiles, { 2: [at('revenue', 1, 1), at('notes', 1, 2)] }, 200);
    machine.keydown('revenue', 'm');
    machine.keydown('revenue', 'ArrowDown');
    expect(pos(machine.rendered, 'revenue')).toEqual({ colStart: 1, rowStart: 3, colSpan: 1, rowSpan: 1 });
    expect(machine.snapshot.announcement.text).toBe('Column 1 of 2, row 3.');
  });

  it('announces the edge instead of doing nothing', () => {
    const { machine } = setup(tiles, { 2: [at('revenue', 1, 1), at('notes', 1, 2)] }, 200);
    machine.keydown('revenue', 'm');
    machine.keydown('revenue', 'ArrowUp');
    expect(machine.snapshot.announcement.text).toBe('Already in row 1.');
    machine.keydown('revenue', 'ArrowLeft');
    expect(machine.snapshot.announcement.text).toBe('Already in column 1.');
  });

  it('says "Move blocked." only when no cell in that direction is free', () => {
    const { machine } = setup(tiles, { 2: [at('revenue', 1, 1), at('notes', 2, 1)] }, 200);
    machine.keydown('revenue', 'm');
    machine.keydown('revenue', 'ArrowRight');
    expect(machine.snapshot.announcement.text).toBe('Move blocked.');
    expect(pos(machine.rendered, 'revenue')?.colStart).toBe(1);
  });
});
