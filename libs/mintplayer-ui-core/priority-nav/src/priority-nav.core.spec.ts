import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { moreWidthCss, priorityNavCore, type PriorityNavInputs, type PriorityNavView } from './priority-nav.core';

const ITEMS = [
  { key: 'a', label: 'A', href: '/a', priority: 1 },
  { key: 'b', label: 'B', href: '/b', priority: 2, hideBelow: 'md' as const },
  { key: 'c', label: 'C', href: '/c' },
];

const inputs = (o: Partial<PriorityNavInputs> = {}): PriorityNavInputs => ({
  items: ITEMS,
  moreLabel: 'More',
  collapseAt: null,
  overflowFrom: 'end',
  hideEmptyMore: true,
  label: 'Sections',
  ...o,
});

const link = (row: PriorityNavView['rows'][number]) => el('a', { ...row.link, href: row.href ?? null }, String(row.item.label));

// `mp-host`: the root bag lands on the host itself.
const markup = ({ view }: { view: PriorityNavView }, host: HTMLElement) => {
  applyBag(host, view.root);
  return [
    view.checkbox && el('input', view.checkbox),
    view.measure && el('div', view.measure, el('div', null, ...view.rows.map((r) => el('span', r.measure, link(r))))),
    el('div', view.strip,
      ...view.rows.map((r) => el('span', r.inline, link(r))),
      view.moreSlot && el('span', view.moreSlot, view.more && el('button', view.more, view.moreLabel))),
    el('div', view.overflow, ...view.rows.map((r) => el('span', r.overflow, link(r)))),
  ].filter((n): n is HTMLElement => !!n);
};

/** Widths by what the element is: every item 100px, the More slot 50px. */
let stripWidth = 1000;
beforeEach(() => {
  stripWidth = 1000;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const width = this.hasAttribute('data-priority-measure') ? 100 : this.hasAttribute('data-priority-more') ? 50 : 0;
    return { width, height: 0, left: 0, top: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute('data-priority-strip') ? stripWidth : 0;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

const mount = (o: Partial<PriorityNavInputs> = {}) => {
  const h = hostCore(priorityNavCore, inputs(o), { markup });
  h.attach();
  const resize = () => {
    window.dispatchEvent(new Event('resize'));
    h.render();
  };
  const more = () => h.host.querySelector<HTMLButtonElement>('[data-priority-toggle]')!;
  const click = (target: Element, init: MouseEventInit = {}) => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));
    h.render();
  };
  return { ...h, resize, more, click };
};

describe('connectPriorityNav', () => {
  it('renders the no-JS disclosure on the server', () => {
    const h = hostCore(priorityNavCore, inputs(), { hydrated: false, label: 'Main' });
    const { view } = h.props();
    expect(view.root).toMatchObject({ class: 'priority-nav noscript', 'aria-label': 'Main' });
    expect(view.checkbox).toMatchObject({ type: 'checkbox', 'aria-controls': 'mp-test-overflow' });
    expect(view.noscriptToggle).toMatchObject({ for: 'mp-test-more' });
    expect(view.measure).toBeNull();
    expect(view.more).toBeNull();
    expect(view.css).toBeNull();
    expect(view.rows[1].inline['class']).toBe('priority-nav-item priority-nav-item-hide-below-md');
  });

  it('formats the More width rule', () => {
    expect(moreWidthCss('x', null)).toBeNull();
    expect(moreWidthCss('x', 40)).toBe('[data-priority-nav="x"]{--priority-nav-more-width:40px}');
  });

  it('renders the hydrated strip, an idle More while nothing overflows, and no items at all', () => {
    const h = hostCore(priorityNavCore, inputs({ items: undefined as never }), { hydrated: true });
    const { view } = h.props();
    expect(view.rows).toEqual([]);
    expect(view.css).toBeNull();
    expect(view.moreSlot?.['class']).toContain('priority-nav-more-slot-idle');
  });
});

describe('priorityNavCore attached', () => {
  it('measures: everything fits, then the least important item overflows', () => {
    const h = mount();
    h.resize();
    expect(h.state()).toMatchObject({ overflowing: [], moreWidth: 50 });
    expect(h.events('overflowChange')).toEqual([]);
    expect(h.props().view.css).toContain('50px');

    stripWidth = 260;
    h.resize();
    expect(h.state().overflowing).toEqual(['c']);
    expect(h.events('overflowChange')).toEqual([[ITEMS[2]]]);
    expect(h.host.querySelector('[data-priority-strip] .priority-nav-hidden')?.textContent).toBe('C');
    h.resize();
    expect(h.events('overflowChange')).toHaveLength(1);
  });

  it('collapses everything below collapseAt', () => {
    const h = mount({ collapseAt: 'xxl' });
    h.resize();
    expect(h.state().overflowing).toEqual(['a', 'b', 'c']);
    expect(h.props().view.overflow['class']).toContain('priority-nav-overflow-align-start');
  });

  it('opens and closes the overflow with More, giving focus back to More', () => {
    const h = mount();
    h.click(h.more());
    expect(h.state().open).toBe(true);
    expect(h.more().getAttribute('aria-expanded')).toBe('true');
    const panelLink = h.host.querySelector<HTMLAnchorElement>('[data-priority-overflow] a')!;
    panelLink.focus();
    const more = h.more();
    panelLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.state().open).toBe(false);
    expect(document.activeElement).toBe(more);
    h.render();
    h.click(h.more(), { button: 1 });
    expect(h.state().open).toBe(false);
  });

  it('closes on Escape and on a click outside, not on clicks within', () => {
    const h = mount();
    h.click(h.more());
    h.click(h.host.querySelector('[data-priority-overflow]')!);
    expect(h.state().open).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(h.state().open).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    h.click(h.more());
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 2 }));
    h.click(h.host.querySelector('[data-priority-strip]')!);
    expect(h.state().open).toBe(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.state().open).toBe(false);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  it('releases its dismiss entry and stops measuring once disposed', () => {
    const h = mount();
    h.click(h.more());
    h.dispose();
    stripWidth = 10;
    window.dispatchEvent(new Event('resize'));
    expect(h.state().overflowing).toEqual([]);
  });

  it('skips measuring without a strip', () => {
    const h = hostCore(priorityNavCore, inputs(), { markup: () => null });
    h.attach();
    window.dispatchEvent(new Event('resize'));
    expect(h.state().moreWidth).toBeNull();
  });
});
