import { describe, expect, it } from 'vitest';
import { connectPagination, nextPage, previousPage, type PaginationState } from './pagination';

const state = (over: Partial<PaginationState> = {}): PaginationState => ({
  pageNumbers: [1, 2, 3, 4, 5],
  selectedPageNumber: 3,
  numberOfBoxes: 0,
  showArrows: true,
  size: 'medium',
  ...over,
});

describe('connectPagination', () => {
  it('renders Bootstrap classes, arrows around every page and the current page', () => {
    const view = connectPagination(state());
    expect(view.listClass).toBe('pagination');
    expect(view.tag).toBe('button');
    expect(view.nav).toEqual({ 'aria-label': 'Pagination' });
    expect(view.entries.map((entry) => entry.text)).toEqual(['«', '1', '2', '3', '4', '5', '»']);
    const current = view.entries[3];
    expect(current.itemClass).toBe('page-item active');
    expect(current.attrs['aria-current']).toBe('page');
    expect(current.attrs['aria-label']).toBe('Page 3');
    expect(current.attrs['type']).toBe('button');
  });

  it('disables the arrow at either end', () => {
    const first = connectPagination(state({ selectedPageNumber: 1 })).entries[0];
    expect(first).toMatchObject({ itemClass: 'page-item disabled', target: null });
    expect(first.attrs['disabled']).toBe(true);
    const last = connectPagination(state({ selectedPageNumber: 5 })).entries.at(-1)!;
    expect(last).toMatchObject({ itemClass: 'page-item disabled', target: null });
  });

  it('maps size onto the Bootstrap modifier', () => {
    expect(connectPagination(state({ size: 'small' })).listClass).toBe('pagination pagination-sm');
    expect(connectPagination(state({ size: 'large' })).listClass).toBe('pagination pagination-lg');
  });

  it('caps the boxes and renders the gap hidden from AT', () => {
    const view = connectPagination(state({ pageNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9], selectedPageNumber: 5, numberOfBoxes: 7 }));
    expect(view.entries).toHaveLength(7);
    const gap = view.entries.find((entry) => entry.kind === 'gap')!;
    expect(gap).toMatchObject({ itemClass: 'page-item disabled', text: '…' });
    expect(gap.attrs['aria-hidden']).toBe('true');
  });

  it('renders links with hrefFor, and a disabled arrow without an href', () => {
    const view = connectPagination(state({ selectedPageNumber: 1, hrefFor: (page) => `?page=${page}` }));
    expect(view.tag).toBe('a');
    expect(view.entries[0]).toMatchObject({ href: null, attrs: { 'aria-disabled': 'true' } });
    expect(view.entries[2]).toMatchObject({ href: '?page=2', attrs: { 'aria-label': 'Page 2' } });
    expect(view.entries.at(-1)).toMatchObject({ href: '?page=2' });
    expect(view.entries.every((entry) => !('href' in entry.attrs))).toBe(true);
  });

  it('takes localized labels', () => {
    const view = connectPagination(state({
      labels: { navigation: 'Paginering', previous: 'Vorige', next: 'Volgende', page: (page) => `Pagina ${page}` },
    }));
    expect(view.nav['aria-label']).toBe('Paginering');
    expect(view.entries.map((entry) => entry.attrs['aria-label'])).toEqual([
      'Vorige', 'Pagina 1', 'Pagina 2', 'Pagina 3', 'Pagina 4', 'Pagina 5', 'Volgende',
    ]);
  });
});

describe('previousPage / nextPage', () => {
  it('step through the list and stop at the ends', () => {
    expect(previousPage([1, 2, 3], 2)).toBe(1);
    expect(previousPage([1, 2, 3], 1)).toBeNull();
    expect(nextPage([1, 2, 3], 2)).toBe(3);
    expect(nextPage([1, 2, 3], 3)).toBeNull();
  });

  it('recover from a selection outside the list', () => {
    expect(previousPage([1, 2, 3], 9)).toBe(1);
    expect(nextPage([1, 2, 3], 9)).toBe(3);
  });
});
