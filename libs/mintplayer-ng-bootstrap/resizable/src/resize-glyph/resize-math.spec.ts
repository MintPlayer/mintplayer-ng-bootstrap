import { ResizeAction } from '../interfaces/resize-action';
import { dragResize, keyboardResizePoint, MIN_RESIZE_SIZE, toPhysicalSides } from './resize-math';

const action = (over: Partial<ResizeAction>): ResizeAction => ({
  positioning: 'absolute',
  sides: [],
  rect: { left: 100, top: 50, width: 200, height: 120 },
  offset: { left: 20, top: 5 },
  margin: { left: 4, right: 6, top: 8, bottom: 12 },
  ...over,
});

describe('toPhysicalSides', () => {
  it('maps start to left and end to right in a left-to-right document', () => {
    expect(toPhysicalSides(['top', 'start'], false)).toEqual(['top', 'left']);
    expect(toPhysicalSides(['bottom', 'end'], false)).toEqual(['bottom', 'right']);
  });

  it('maps start to right and end to left in a right-to-left document', () => {
    expect(toPhysicalSides(['top', 'start'], true)).toEqual(['top', 'right']);
    expect(toPhysicalSides(['end'], true)).toEqual(['left']);
  });
});

describe('dragResize, absolute positioning', () => {
  it('right edge: widens from the fixed left edge', () => {
    expect(dragResize(action({ sides: ['right'] }), 350, 0)).toEqual({ width: 250 });
  });

  it('right edge: never shrinks below the minimum size', () => {
    expect(dragResize(action({ sides: ['right'] }), 0, 0)).toEqual({ width: MIN_RESIZE_SIZE });
  });

  it('left edge: moves left in containing-block coordinates and keeps the right edge fixed', () => {
    // pointer 30px left of the captured left edge: the offset (20), not the viewport x (70), moves
    expect(dragResize(action({ sides: ['left'] }), 70, 0)).toEqual({ left: -10, width: 230 });
  });

  it('left edge: clamps at the minimum size before the right edge', () => {
    expect(dragResize(action({ sides: ['left'] }), 1000, 0)).toEqual({ left: 20 + 190, width: MIN_RESIZE_SIZE });
  });

  it('bottom edge: grows the height from the fixed top edge', () => {
    expect(dragResize(action({ sides: ['bottom'] }), 0, 200)).toEqual({ height: 150 });
  });

  it('top edge: moves the top in containing-block coordinates and keeps the bottom fixed', () => {
    expect(dragResize(action({ sides: ['top'] }), 0, 40)).toEqual({ top: -5, height: 130 });
  });

  it('a corner resizes both axes at once', () => {
    expect(dragResize(action({ sides: ['bottom', 'right'] }), 310, 180)).toEqual({ width: 210, height: 130 });
  });

  it('a glyph with no sides changes nothing', () => {
    expect(dragResize(action({ sides: [] }), 500, 500)).toEqual({});
  });
});

describe('dragResize, inline positioning', () => {
  const inline = (sides: ResizeAction['sides']) => action({ positioning: 'inline', sides });

  it('right edge: grows by giving back right margin', () => {
    expect(dragResize(inline(['right']), 320, 0)).toEqual({ marginRight: 6 - 20 });
  });

  it('left edge: grows by giving back left margin', () => {
    expect(dragResize(inline(['left']), 90, 0)).toEqual({ marginLeft: 4 - 10 });
  });

  it('bottom edge: trades bottom margin for height so the content below stays put', () => {
    expect(dragResize(inline(['bottom']), 0, 190)).toEqual({ height: 140, marginBottom: 12 - 20 });
  });

  it('top edge: trades top margin for height', () => {
    expect(dragResize(inline(['top']), 0, 40)).toEqual({ height: 130, marginTop: 8 - 10 });
  });
});

describe('keyboardResizePoint', () => {
  it('moves the glyph\'s own edge: a left glyph starts from the left edge', () => {
    expect(keyboardResizePoint(action({ sides: ['left'] }), 'ArrowLeft', 10)).toEqual({ x: 90, y: 0 });
  });

  it('a right glyph starts from the right edge', () => {
    expect(keyboardResizePoint(action({ sides: ['right'] }), 'ArrowRight', 1)).toEqual({ x: 301, y: 0 });
  });

  it('a top glyph starts from the top edge, a bottom glyph from the bottom edge', () => {
    expect(keyboardResizePoint(action({ sides: ['top'] }), 'ArrowUp', 10)).toEqual({ x: 0, y: 40 });
    expect(keyboardResizePoint(action({ sides: ['bottom'] }), 'ArrowDown', 10)).toEqual({ x: 0, y: 180 });
  });

  it('a corner handles both axes', () => {
    const corner = action({ sides: ['top', 'left'] });
    expect(keyboardResizePoint(corner, 'ArrowRight', 10)).toEqual({ x: 110, y: 50 });
    expect(keyboardResizePoint(corner, 'ArrowDown', 10)).toEqual({ x: 100, y: 60 });
  });

  it('ignores an arrow on an axis the glyph does not resize, and other keys', () => {
    expect(keyboardResizePoint(action({ sides: ['top'] }), 'ArrowLeft', 10)).toBeNull();
    expect(keyboardResizePoint(action({ sides: ['left'] }), 'ArrowUp', 10)).toBeNull();
    expect(keyboardResizePoint(action({ sides: ['left'] }), 'Enter', 10)).toBeNull();
  });

  it('a key press is a one-step drag: the start glyph grows leftwards, the right edge stays', () => {
    const a = action({ sides: ['left'] });
    const p = keyboardResizePoint(a, 'ArrowLeft', 10)!;
    const update = dragResize(a, p.x, p.y);
    expect(update).toEqual({ left: 10, width: 210 });
    // the right edge in containing-block coordinates: offset.left + width before and after
    expect(update.left! + update.width!).toBe(20 + 200);
  });
});
