import { fitColumns, generateBreakpoints, maxColumnCount, resolveBreakpoints, resolveColumnCount } from './columns';

const base = { minColumnWidth: 200, gap: 16 };

describe('fitColumns', () => {
  it('counts whole minimum-width columns including the gaps between them', () => {
    expect(fitColumns(200, 200, 16)).toBe(1);
    expect(fitColumns(415, 200, 16)).toBe(1);
    expect(fitColumns(416, 200, 16)).toBe(2);
    expect(fitColumns(632, 200, 16)).toBe(3);
  });

  it('never returns less than 1', () => {
    expect(fitColumns(0, 200, 16)).toBe(1);
    expect(fitColumns(50, 200, 16)).toBe(1);
  });
});

describe('generateBreakpoints', () => {
  it('emits one entry per count up to maxColumns when nothing is stored', () => {
    expect(generateBreakpoints({ ...base, maxColumns: 3 })).toEqual([
      { minWidth: 0, columns: 1 },
      { minWidth: 416, columns: 2 },
      { minWidth: 632, columns: 3 },
    ]);
  });

  it('defaults to 6 columns', () => {
    expect(generateBreakpoints(base)).toHaveLength(6);
  });

  it('takes the largest stored count over maxColumns', () => {
    expect(maxColumnCount({ maxColumns: 6, layouts: { 2: [], 8: [] } })).toBe(8);
    expect(generateBreakpoints({ ...base, layouts: { 4: [] } }).map((b) => b.columns)).toEqual([1, 2, 3, 4]);
  });
});

describe('resolveBreakpoints', () => {
  it('turns stackBelow into a two-entry map', () => {
    expect(resolveBreakpoints({ ...base, stackBelow: 700, maxColumns: 4 })).toEqual([
      { minWidth: 0, columns: 1 },
      { minWidth: 700, columns: 4 },
    ]);
  });

  it('prefers an explicit map, sorted by minWidth', () => {
    const breakpoints = [
      { minWidth: 1200, columns: 6 },
      { minWidth: 600, columns: 3 },
    ];
    expect(resolveBreakpoints({ ...base, breakpoints, stackBelow: 400 })).toEqual([
      { minWidth: 600, columns: 3 },
      { minWidth: 1200, columns: 6 },
    ]);
  });
});

describe('resolveColumnCount', () => {
  it('uses the generated map, which matches the fit', () => {
    expect(resolveColumnCount(390, base)).toBe(1);
    expect(resolveColumnCount(700, base)).toBe(3);
    expect(resolveColumnCount(2560, base)).toBe(6);
  });

  it('lets a breakpoint wrap earlier than minColumnWidth would', () => {
    const breakpoints = [
      { minWidth: 0, columns: 1 },
      { minWidth: 1000, columns: 4 },
    ];
    expect(resolveColumnCount(999, { ...base, breakpoints })).toBe(1);
    expect(resolveColumnCount(1000, { ...base, breakpoints })).toBe(4);
  });

  it('never lets a breakpoint exceed the fit', () => {
    const breakpoints = [{ minWidth: 0, columns: 6 }];
    expect(resolveColumnCount(700, { ...base, breakpoints })).toBe(3);
  });

  it('is 1 below the smallest minWidth', () => {
    expect(resolveColumnCount(500, { ...base, breakpoints: [{ minWidth: 600, columns: 3 }] })).toBe(1);
  });

  it('applies stackBelow', () => {
    expect(resolveColumnCount(699, { ...base, stackBelow: 700 })).toBe(1);
    expect(resolveColumnCount(700, { ...base, stackBelow: 700 })).toBe(3);
  });
});
