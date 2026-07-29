import { afterEach, describe, expect, it } from 'vitest';
import './mp-pagination';
import type { MpPagination } from './mp-pagination';

/**
 * ARIA surface of `<mp-pagination>` that `mp-pagination.spec.ts` does not cover:
 * the `<nav>` naming channel (this component takes the name from the HOST
 * `aria-label`, not from `input-label`, so `_conformance/naming.spec.ts` cannot
 * carry it) and the state transitions — `aria-current` moving between buttons,
 * and the arrows' disabled edges flipping back off.
 */
async function mount(attrs = ''): Promise<MpPagination> {
  document.body.innerHTML = `<mp-pagination ${attrs}></mp-pagination>`;
  const el = document.querySelector('mp-pagination') as MpPagination;
  await el.updateComplete;
  return el;
}

async function withPages(el: MpPagination, pages: number[], selected: number, boxes = 0): Promise<void> {
  el.pageNumbers = pages;
  el.selectedPageNumber = selected;
  el.numberOfBoxes = boxes;
  await el.updateComplete;
}

const nav = (el: MpPagination) => el.shadowRoot!.querySelector('nav') as HTMLElement;
const pageButtons = (el: MpPagination) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.page-link')).filter(
    (b) => b.getAttribute('aria-label')?.startsWith('Page '),
  );
const currents = (el: MpPagination) =>
  Array.from(el.shadowRoot!.querySelectorAll('[aria-current]')).map((b) => b.textContent?.trim());
const arrow = (el: MpPagination, label: 'Previous' | 'Next') =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-pagination naming', () => {
  it('names the <nav> "Pagination" when the consumer names nothing', async () => {
    const el = await mount();
    await withPages(el, [1, 2, 3], 1);
    expect(nav(el).getAttribute('aria-label')).toBe('Pagination');
  });

  it('takes the name from the host aria-label', async () => {
    const el = await mount('aria-label="Search results pages"');
    await withPages(el, [1, 2, 3], 1);
    expect(nav(el).getAttribute('aria-label')).toBe('Search results pages');
  });

  it('keeps the <nav> name live when the host aria-label changes or is removed', async () => {
    const el = await mount('aria-label="First"');
    await withPages(el, [1, 2, 3], 1);

    el.setAttribute('aria-label', 'Second');
    await el.updateComplete;
    expect(nav(el).getAttribute('aria-label')).toBe('Second');

    el.removeAttribute('aria-label');
    await el.updateComplete;
    expect(nav(el).getAttribute('aria-label')).toBe('Pagination');
  });

  it('never copies host IDREF strings into the shadow root', async () => {
    document.body.innerHTML =
      '<span id="outer">Pages</span><mp-pagination aria-labelledby="outer" aria-describedby="outer"></mp-pagination>';
    const el = document.querySelector('mp-pagination') as MpPagination;
    await withPages(el, [1, 2, 3], 2);
    expect(el.shadowRoot!.querySelector('[aria-labelledby], [aria-describedby]')).toBeNull();
  });

  it('names every page button "Page N" and hides the ellipsis from the tree', async () => {
    const el = await mount();
    await withPages(el, Array.from({ length: 90 }, (_, i) => i + 1), 45, 7);

    expect(pageButtons(el).map((b) => b.getAttribute('aria-label'))).toEqual(['Page 1', 'Page 45', 'Page 90']);

    const gaps = Array.from(el.shadowRoot!.querySelectorAll('.ellipsis'));
    expect(gaps).toHaveLength(2);
    expect(gaps.every((g) => g.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(gaps.every((g) => !g.hasAttribute('aria-current') && g.tagName === 'SPAN')).toBe(true);
  });
});

describe('mp-pagination aria-current transitions', () => {
  it('moves aria-current on a programmatic selectedPageNumber write, in both directions', async () => {
    const el = await mount();
    await withPages(el, [1, 2, 3, 4, 5], 3);
    expect(currents(el)).toEqual(['3']);

    el.selectedPageNumber = 5;
    await el.updateComplete;
    expect(currents(el)).toEqual(['5']);

    el.selectedPageNumber = 1;
    await el.updateComplete;
    expect(currents(el)).toEqual(['1']);
  });

  it('moves aria-current when the selected-page-number ATTRIBUTE is rewritten', async () => {
    const el = await mount('page-numbers="1,2,3,4,5" selected-page-number="2"');
    await el.updateComplete;
    expect(currents(el)).toEqual(['2']);

    el.setAttribute('selected-page-number', '4');
    await el.updateComplete;
    expect(currents(el)).toEqual(['4']);
  });

  it('moves aria-current when the arrow buttons are clicked', async () => {
    const el = await mount();
    await withPages(el, [1, 2, 3, 4, 5], 3);

    arrow(el, 'Next').click();
    await el.updateComplete;
    expect(currents(el)).toEqual(['4']);

    arrow(el, 'Previous').click();
    await el.updateComplete;
    expect(currents(el)).toEqual(['3']);
  });

  it('marks NO page as current when the selected page is not in the list', async () => {
    const el = await mount();
    await withPages(el, [1, 2, 3], 99);
    expect(currents(el)).toEqual([]);
  });
});

describe('mp-pagination arrow disabled edges', () => {
  it('flips each arrow disabled state back off when the selection leaves the edge', async () => {
    const el = await mount();
    await withPages(el, [1, 2, 3, 4, 5], 1);
    expect(arrow(el, 'Previous').disabled).toBe(true);
    expect(arrow(el, 'Next').disabled).toBe(false);

    el.selectedPageNumber = 3;
    await el.updateComplete;
    expect(arrow(el, 'Previous').disabled).toBe(false);
    expect(arrow(el, 'Next').disabled).toBe(false);

    el.selectedPageNumber = 5;
    await el.updateComplete;
    expect(arrow(el, 'Next').disabled).toBe(true);

    el.selectedPageNumber = 1;
    await el.updateComplete;
    expect(arrow(el, 'Next').disabled).toBe(false);
    expect(arrow(el, 'Previous').disabled).toBe(true);
  });

  it('uses the native disabled channel only — never a parallel aria-disabled', async () => {
    const el = await mount();
    await withPages(el, [1, 2, 3], 1);
    expect(el.shadowRoot!.querySelector('[aria-disabled]')).toBeNull();
  });
});
