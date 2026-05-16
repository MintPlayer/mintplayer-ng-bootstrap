import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-pagination';
import { buildPaginationItems, type MpPagination } from './mp-pagination';

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

describe('buildPaginationItems', () => {
  it('shows every page when budget >= count', () => {
    const items = buildPaginationItems([1, 2, 3, 4, 5], 3, 5);
    expect(items.map((i) => (i.kind === 'page' ? i.page : '…'))).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns a centered window when budget < 5 (no room for anchors)', () => {
    const items = buildPaginationItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, 3);
    expect(items.map((i) => (i.kind === 'page' ? i.page : '…'))).toEqual([4, 5, 6]);
  });

  it('places left edge cleanly when current is near the start', () => {
    const items = buildPaginationItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 2, 7);
    expect(items.map((i) => (i.kind === 'page' ? i.page : '…'))).toEqual([1, 2, 3, 4, 5, '…', 10]);
  });

  it('places right edge cleanly when current is near the end', () => {
    const items = buildPaginationItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 9, 7);
    expect(items.map((i) => (i.kind === 'page' ? i.page : '…'))).toEqual([1, '…', 6, 7, 8, 9, 10]);
  });

  it('renders anchors + both gaps when current is in the middle', () => {
    const items = buildPaginationItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, 7);
    expect(items.map((i) => (i.kind === 'page' ? i.page : '…'))).toEqual([1, '…', 4, 5, 6, '…', 10]);
  });

  it('uses page 2/9 instead of a 1-away gap', () => {
    // budget=7, current=3 → window=[2,3,4]; lo=1 means show page 2 not '…'
    const items = buildPaginationItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, 7);
    expect(items.map((i) => (i.kind === 'page' ? i.page : '…'))).toEqual([1, 2, 3, 4, 5, '…', 10]);
  });

  it('marks the current page', () => {
    const items = buildPaginationItems([1, 2, 3, 4, 5], 3, 5);
    expect(items.filter((i) => i.kind === 'page' && i.current).map((i) => (i.kind === 'page' ? i.page : null))).toEqual([3]);
  });

  it('handles empty list', () => {
    expect(buildPaginationItems([], 1, 7)).toEqual([]);
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
    el.selectedPageNumber = 1;
    el.numberOfBoxes = 7;
    await settled(el);
    let received: number | null = null;
    el.addEventListener('mp-pagination-page-change', (ev) => {
      received = (ev as CustomEvent<{ page: number }>).detail.page;
    });
    const buttons = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.page-link');
    // skip the prev-arrow → buttons[0]; first page button is buttons[1]
    buttons[3].click(); // page 3
    expect(received).toBe(3);
    await settled(el);
    expect(el.shadowRoot!.querySelector('button[aria-current="page"]')?.textContent?.trim()).toBe('3');
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
