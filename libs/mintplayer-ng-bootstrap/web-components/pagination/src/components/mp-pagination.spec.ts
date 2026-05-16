import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-pagination';
import { buildPaginationLayout, type MpPagination } from './mp-pagination';

function fixture(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

async function settled<T extends HTMLElement>(el: T): Promise<T> {
  if ('updateComplete' in el) {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  }
  return el;
}

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

describe('<mp-pagination>', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = fixture('<mp-pagination></mp-pagination>');
  });
  afterEach(() => {
    host.remove();
  });

  it('renders page buttons with current marker', async () => {
    const el = host.firstElementChild as MpPagination;
    el.pageNumbers = [1, 2, 3, 4, 5];
    el.selectedPageNumber = 3;
    el.numberOfBoxes = 7;
    await settled(el);
    const buttons = el.shadowRoot!.querySelectorAll('button.page-link');
    // 5 page buttons + 2 arrows (default showArrows = true)
    expect(buttons.length).toBe(7);
    const current = el.shadowRoot!.querySelector('button[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('3');
  });

  it('emits mp-pagination-page-change on click', async () => {
    const el = host.firstElementChild as MpPagination;
    el.pageNumbers = [1, 2, 3, 4, 5];
    el.selectedPageNumber = 3;
    el.numberOfBoxes = 7;
    await settled(el);
    let received: number | null = null;
    el.addEventListener('mp-pagination-page-change', (ev) => {
      received = (ev as CustomEvent<{ page: number }>).detail.page;
    });
    // With budget=7 + showArrows=true, all 5 pages render: [<, 1, 2, 3=C, 4, 5, >].
    // Click page 4.
    const page4 = Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.page-link'))
      .find((b) => b.textContent?.trim() === '4');
    page4!.click();
    expect(received).toBe(4);
    await settled(el);
    expect(el.shadowRoot!.querySelector('button[aria-current="page"]')?.textContent?.trim()).toBe('4');
  });

  it('disables previous on first page and next on last page', async () => {
    const el = host.firstElementChild as MpPagination;
    el.pageNumbers = [1, 2, 3, 4, 5];
    el.selectedPageNumber = 1;
    el.numberOfBoxes = 7;
    await settled(el);
    const prev = el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Previous"]');
    expect(prev?.disabled).toBe(true);
    el.selectedPageNumber = 5;
    await settled(el);
    const next = el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Next"]');
    expect(next?.disabled).toBe(true);
  });

  it('hides arrows when show-arrows="false"', async () => {
    const el = host.firstElementChild as MpPagination;
    el.pageNumbers = [1, 2, 3];
    el.showArrows = false;
    await settled(el);
    expect(el.shadowRoot!.querySelector('button[aria-label="Previous"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('button[aria-label="Next"]')).toBeNull();
  });

  it('reads attribute syntax (page-numbers, selected-page-number, number-of-boxes, size)', async () => {
    host.innerHTML = '<mp-pagination page-numbers="1,2,3,4,5,6,7,8,9,10" selected-page-number="5" number-of-boxes="7" size="small"></mp-pagination>';
    const el = host.firstElementChild as MpPagination;
    await settled(el);
    expect(el.pageNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(el.selectedPageNumber).toBe(5);
    expect(el.numberOfBoxes).toBe(7);
    expect(el.size).toBe('small');
  });
});
