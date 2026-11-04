import { fittedColumnWidth, MIN_COLUMN_WIDTH, resizedColumnWidth } from './column-resize';

describe('column resize', () => {
  it('clamps a resized column to the floor', () => {
    expect(resizedColumnWidth(100, 25)).toBe(125);
    expect(resizedColumnWidth(50, -30)).toBe(MIN_COLUMN_WIDTH);
  });

  it('fits the widest finite content, rounded up and floored', () => {
    expect(fittedColumnWidth([80.2, 120.1, Number.NaN])).toBe(121);
    expect(fittedColumnWidth([12])).toBe(MIN_COLUMN_WIDTH);
    expect(fittedColumnWidth([])).toBeNull();
    expect(fittedColumnWidth([Number.POSITIVE_INFINITY])).toBeNull();
  });
});
