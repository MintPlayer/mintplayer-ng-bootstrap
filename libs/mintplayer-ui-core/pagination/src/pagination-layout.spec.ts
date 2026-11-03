import { describe, expect, it } from 'vitest';
import { buildPaginationLayout } from './pagination';

// The layout table (moved from the retired hand-written mp-pagination spec, #458 M4).
/** Compact serialisation used to compare against the PRD growth-table. */
function serialise(pages: ReadonlyArray<number>, current: number, budget: number, showArrows = true): string {
  const layout = buildPaginationLayout(pages, current, budget, showArrows);
  const C = current;
  const tokens: string[] = [];
  if (layout.showPrev) tokens.push('<');
  layout.items.forEach((it) => {
    if (it.kind === 'gap') tokens.push('...');
    else if (it.page === C) tokens.push('C');
    else if (it.page === C - 1) tokens.push('C-1');
    else if (it.page === C - 2) tokens.push('C-2');
    else if (it.page === C - 3) tokens.push('C-3');
    else if (it.page === C + 1) tokens.push('C+1');
    else if (it.page === C + 2) tokens.push('C+2');
    else if (it.page === C + 3) tokens.push('C+3');
    else tokens.push(String(it.page));
  });
  if (layout.showNext) tokens.push('>');
  return tokens.join(' ');
}

describe('buildPaginationLayout — PRD growth table', () => {
  // Use a 90-page array with current=45 so every transition is far from
  // edges (mirrors the PRD's diagrams exactly).
  const pages = Array.from({ length: 90 }, (_, i) => i + 1);
  const current = 45;

  it.each([
    [1, 'C'],
    [2, 'C >'],
    [3, '< C >'],
    [4, '< 1 C >'],
    [5, '< 1 C 90 >'],
    [6, '< 1 ... C 90 >'],
    [7, '< 1 ... C ... 90 >'],
    [8, '< 1 ... C-1 C ... 90 >'],
    [9, '< 1 ... C-1 C C+1 ... 90 >'],
    [10, '< 1 2 ... C-1 C C+1 ... 90 >'],
    [11, '< 1 2 ... C-1 C C+1 ... 89 90 >'],
    [12, '< 1 2 ... C-2 C-1 C C+1 ... 89 90 >'],
    [13, '< 1 2 ... C-2 C-1 C C+1 C+2 ... 89 90 >'],
    [14, '< 1 2 3 ... C-2 C-1 C C+1 C+2 ... 89 90 >'],
    [15, '< 1 2 3 ... C-2 C-1 C C+1 C+2 ... 88 89 90 >'],
  ])('budget=%i renders %s', (budget, expected) => {
    expect(serialise(pages, current, budget)).toBe(expected);
  });
});

describe('buildPaginationLayout — edges', () => {
  const pages = Array.from({ length: 90 }, (_, i) => i + 1);

  it('current=1 (first page) skips the empty "before" direction', () => {
    // Page 1 IS current → serialised as "C".
    expect(serialise(pages, 1, 5)).toBe('< C ... 90 >');
  });

  it('current=last skips the empty "after" direction', () => {
    // Page 90 IS current → serialised as "C".
    expect(serialise(pages, 90, 5)).toBe('< 1 ... C >');
  });

  it('handles non-contiguous page arrays (e.g. perPage selectors)', () => {
    const layout = buildPaginationLayout([10, 20, 50, 100], 20, 4, false);
    expect(layout.items.map((i) => (i.kind === 'page' ? i.page : '…'))).toEqual([10, 20, 50, 100]);
  });

  it('current=middle of 4 pages shows them all (budget exceeds count)', () => {
    // pages=[1,2,3,4], current=2 → pages 1=C-1, 2=C, 3=C+1, 4=C+2.
    expect(serialise([1, 2, 3, 4], 2, 10)).toBe('< C-1 C C+1 C+2 >');
  });

  it('1-page right gap: extends end instead of rendering a single-page ellipsis', () => {
    // 7 pages, current=5. Hidden-right = 1 (page 6 only). Naively the right
    // ellipsis would represent just page 6; instead extend end to make it
    // visible: `< 1 ... C 6 7 >`.
    const sevenPages = Array.from({ length: 7 }, (_, i) => i + 1);
    expect(serialise(sevenPages, 5, 7)).toBe('< 1 ... C C+1 C+2 >');
  });

  it('1-page mid-gap: ellipsis collapses to the lone hidden page', () => {
    // 7 pages, current=5, budget=9 — Phase 2 advances start until hidden-left
    // is 1; the left ellipsis now represents only page 3, so it's rendered as
    // the page itself. With C=5 the serialiser tags page 2 as C-3, page 3 as
    // C-2, etc.
    const sevenPages = Array.from({ length: 7 }, (_, i) => i + 1);
    expect(serialise(sevenPages, 5, 9)).toBe('< 1 C-3 C-2 C-1 C C+1 C+2 >');
  });
});

describe('buildPaginationLayout — arrows opt-out', () => {
  const pages = Array.from({ length: 90 }, (_, i) => i + 1);

  it('budget grows into pages first when showArrows=false', () => {
    expect(serialise(pages, 45, 1, false)).toBe('C');
    expect(serialise(pages, 45, 2, false)).toBe('1 C');
    expect(serialise(pages, 45, 3, false)).toBe('1 C 90');
    expect(serialise(pages, 45, 4, false)).toBe('1 ... C 90');
    expect(serialise(pages, 45, 5, false)).toBe('1 ... C ... 90');
  });
});
