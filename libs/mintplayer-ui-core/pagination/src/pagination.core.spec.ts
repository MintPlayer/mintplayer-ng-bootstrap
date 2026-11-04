import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { paginationCore, type PaginationInputs, type PaginationRenderView } from './pagination.core';

afterEach(() => document.body.replaceChildren());

const inputs = (o: Partial<PaginationInputs> = {}): PaginationInputs => ({
  pageNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  selectedPageNumber: 1,
  numberOfBoxes: 7,
  showArrows: true,
  size: 'medium' as never,
  labels: null,
  hrefFor: null,
  ...o,
});

function mount(o: Partial<PaginationInputs> = {}, label: string | null = null) {
  const markup = ({ view }: { view: PaginationRenderView }, host: HTMLElement) => {
    applyBag(host, view.root);
    return el('nav', view.nav, el('ul', view.list, ...view.entries.map((e) =>
      el('li', e.item, el(e.gap ? 'span' : e.anchor ? 'a' : 'button', { ...e.link, href: e.href }, e.text)))));
  };
  const h = hostCore(paginationCore, inputs(o), { markup, label });
  h.attach();
  const link = (page: number) => h.host.querySelector<HTMLElement>(`.page-link[data-page="${page}"]:not([aria-label])`) ?? h.host.querySelector<HTMLElement>(`.page-link[data-page="${page}"]`)!;
  const click = (target: HTMLElement, init: MouseEventInit = {}) => {
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(ev);
    return ev;
  };
  return { ...h, link, click };
}

describe('paginationCore', () => {
  it('names the nav from the consumer, and renders gaps', () => {
    const h = mount({}, 'Results pages');
    expect(h.host.querySelector('nav')?.getAttribute('aria-label')).toBe('Results pages');
    expect(h.props().view.entries.some((e) => e.gap)).toBe(true);
  });

  it('selects a clicked page, ignoring the current one and clicks outside the links', () => {
    const h = mount();
    const two = h.link(2);
    expect(h.click(two).defaultPrevented).toBe(true);
    expect(h.state().selectedPageNumber).toBe(2);
    h.click(two);
    h.click(h.host.querySelector('nav')!);
    expect(h.events('selectedPageNumberChange')).toEqual([2]);
  });

  it('leaves a modified click on a real link to the browser', () => {
    const h = mount({ hrefFor: (p) => `?page=${p}` });
    const link = h.link(2);
    expect(link.localName).toBe('a');
    expect(h.click(link, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(h.click(link).defaultPrevented).toBe(true);
    expect(h.events('selectedPageNumberChange')).toEqual([2]);
  });

  it('ignores a link naming no page, follows the consumer’s page and stops once disposed', () => {
    const h = mount();
    const broken = h.host.appendChild(el('a', { class: 'page-link', 'data-page': 'x' }));
    h.click(broken);
    h.setInputs({ selectedPageNumber: 6 });
    h.setInputs({ showArrows: false });
    expect(h.state().selectedPageNumber).toBe(6);
    const link = h.link(2);
    h.dispose();
    h.click(link);
    expect(h.events('selectedPageNumberChange')).toEqual([]);
  });
});
