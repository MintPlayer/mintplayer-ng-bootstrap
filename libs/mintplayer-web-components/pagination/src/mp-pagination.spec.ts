import { afterEach, describe, expect, it } from 'vitest';
import { MpPagination } from './index';

void MpPagination; // force the side-effect registration

/**
 * The generated Lit pagination (#458 M4): light DOM, a <nav> landmark named by
 * the consumer's aria-label, aria-current and the arrows' disabled edges
 * following the two-way `selectedPageNumber`.
 */
async function mount(attrs = '', pages: number[] = [1, 2, 3, 4, 5], selected = 3, boxes = 0): Promise<MpPagination> {
  document.body.innerHTML = `<mp-pagination ${attrs}></mp-pagination>`;
  const el = document.querySelector('mp-pagination') as MpPagination;
  el.pageNumbers = pages;
  el.selectedPageNumber = selected;
  el.numberOfBoxes = boxes;
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

const settle = async (el: MpPagination) => {
  await el.updateComplete;
  await el.updateComplete;
};
const nav = (el: MpPagination) => el.querySelector('nav') as HTMLElement;
const currents = (el: MpPagination) => [...el.querySelectorAll('[aria-current]')].map((b) => b.textContent?.trim());
const arrow = (el: MpPagination, label: 'Previous' | 'Next') =>
  el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const page = (el: MpPagination, text: string) =>
  [...el.querySelectorAll<HTMLElement>('.page-link')].find((b) => b.textContent?.trim() === text)!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-pagination (generated, #458)', () => {
  it('renders Bootstrap markup in the light DOM, stamped with its scope', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.getAttribute('data-mps')).toBe('pagination');
    expect(el.querySelectorAll('nav > ul.pagination > li.page-item > button.page-link')).toHaveLength(7);
  });

  it('names the <nav> "Pagination" by default, and from the consumer aria-label', async () => {
    expect(nav(await mount()).getAttribute('aria-label')).toBe('Pagination');
    expect(nav(await mount('aria-label="Search results"')).getAttribute('aria-label')).toBe('Search results');
  });

  it('names every page "Page N" and hides the ellipsis from AT', async () => {
    const el = await mount('', Array.from({ length: 90 }, (_, i) => i + 1), 45, 7);
    const named = [...el.querySelectorAll('button.page-link')].map((b) => b.getAttribute('aria-label'));
    expect(named).toEqual(['Previous', 'Page 1', 'Page 45', 'Page 90', 'Next']);
    const gaps = [...el.querySelectorAll('span.page-link')];
    expect(gaps).toHaveLength(2);
    expect(gaps.every((g) => g.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('moves aria-current on a property write and on the attribute', async () => {
    const el = await mount();
    expect(currents(el)).toEqual(['3']);
    el.selectedPageNumber = 5;
    await settle(el);
    expect(currents(el)).toEqual(['5']);
    el.setAttribute('selected-page-number', '2');
    await settle(el);
    expect(currents(el)).toEqual(['2']);
  });

  it('selects on click, writes the property back and fires selectedpagenumberchange', async () => {
    const el = await mount();
    const received: number[] = [];
    el.addEventListener('selectedpagenumberchange', (ev) => received.push((ev as CustomEvent<number>).detail));
    page(el, '4').click();
    await settle(el);
    expect(received).toEqual([4]);
    expect(el.selectedPageNumber).toBe(4);
    expect(currents(el)).toEqual(['4']);

    arrow(el, 'Previous').click();
    await settle(el);
    expect(currents(el)).toEqual(['3']);
  });

  it('flips the arrows disabled at the edges, natively only', async () => {
    const el = await mount('', [1, 2, 3, 4, 5], 1);
    expect(arrow(el, 'Previous').disabled).toBe(true);
    expect(arrow(el, 'Next').disabled).toBe(false);
    expect(el.querySelector('[aria-disabled]')).toBeNull();
    el.selectedPageNumber = 5;
    await settle(el);
    expect(arrow(el, 'Previous').disabled).toBe(false);
    expect(arrow(el, 'Next').disabled).toBe(true);
  });

  it('marks no page current when the selection is not in the list', async () => {
    expect(currents(await mount('', [1, 2, 3], 99))).toEqual([]);
  });

  it('hides the arrows with show-arrows="false" and maps size', async () => {
    const el = await mount('size="small"');
    el.showArrows = false;
    await settle(el);
    expect(arrow(el, 'Previous')).toBeNull();
    expect(el.querySelector('ul')?.className).toBe('pagination pagination-sm');
  });

  it('renders real links with hrefFor and leaves a modified click to the browser', async () => {
    const el = await mount();
    el.hrefFor = (n) => `?page=${n}`;
    await settle(el);
    const two = page(el, '2') as HTMLAnchorElement;
    expect(two.localName).toBe('a');
    expect(two.getAttribute('href')).toBe('?page=2');
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    two.dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(false);
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    two.dispatchEvent(plain);
    await settle(el);
    expect(plain.defaultPrevented).toBe(true);
    expect(el.selectedPageNumber).toBe(2);
  });
});
