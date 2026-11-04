import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { activeSectionIndex, headingLevel, scrollspyCore, sectionScrollTop, type ScrollspyInputs, type ScrollspyView } from './scrollspy.core';

/** Viewport tops by element: sections and containers set theirs here. */
const tops = new Map<Element, number>();
const rect = (top: number, height = 20) => ({ top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return rect(tops.get(this) ?? 0);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  tops.clear();
  document.body.replaceChildren();
});

function mount(o: Partial<ScrollspyInputs> = {}, parent: HTMLElement = document.body) {
  const a = el('h2', { 'data-scrollspy': '' }, 'Intro');
  const b = el('h3', { 'data-scrollspy': '' }, 'Details');
  const c = el('p', { 'data-scrollspy': '' }, 'Notes');
  const content = el('div', null, a, b, c);
  tops.set(a, 0).set(b, 500).set(c, 1000);
  const host = parent.appendChild(document.createElement('div'));
  // `mp-host`; the content node is the consumer's and survives a re-render.
  const markup = ({ view }: { view: ScrollspyView }, h: HTMLElement) => {
    applyBag(h, view.root);
    applyBag(content, view.content);
    return [el('nav', view.nav, el('ul', view.list, ...view.entries.map((e) => el('li', null, el('button', e.button, e.text))))), content];
  };
  const h = hostCore(scrollspyCore, { label: 'On this page', scrollContainer: null, offset: 0, ...o }, { host, markup });
  h.attach();
  h.render();
  const entry = (i: number) => h.host.querySelector<HTMLElement>(`[data-scrollspy-index="${i}"]`)!;
  return { ...h, a, b, c, content, entry };
}

describe('scrollspy helpers', () => {
  it('finds the active section, the scroll position and the heading level', () => {
    expect(activeSectionIndex([], 0)).toBe(-1);
    expect(activeSectionIndex([10, 20], 0)).toBe(0);
    expect(activeSectionIndex([-50, 5, 30], 10)).toBe(1);
    expect(sectionScrollTop(300, 50, 100)).toBe(351);
    expect(headingLevel('h3')).toBe(3);
    expect(headingLevel('DIV')).toBe(0);
  });
});

describe('scrollspyCore', () => {
  it('lists the sections with their levels and marks the first active against the window', () => {
    const h = mount({}, document.body);
    expect(h.state()).toMatchObject({ active: 0, contained: false });
    expect(h.state().sections).toEqual([{ text: 'Intro', level: 2 }, { text: 'Details', level: 3 }, { text: 'Notes', level: 0 }]);
    expect(h.entry(0).getAttribute('aria-current')).toBe('location');
    expect(h.entry(1).className).toContain('scrollspy-level-3');
    expect(h.host.querySelector('nav')?.getAttribute('aria-label')).toBe('On this page');
  });

  it('follows the page scroll, ignoring other elements scrolling', () => {
    const h = mount();
    tops.set(h.a, -600).set(h.b, -10).set(h.c, 400);
    h.content.dispatchEvent(new Event('scroll'));
    expect(h.state().active).toBe(0);
    document.dispatchEvent(new Event('scroll'));
    expect(h.state().active).toBe(1);
    document.dispatchEvent(new Event('scroll'));
    expect(h.state().active).toBe(1);
  });

  it('scrolls the window to a clicked entry, below the offset', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const h = mount({ offset: 56 });
    h.entry(1).click();
    expect(scrollTo).toHaveBeenCalledWith({ top: 500 - 56 + window.scrollY + 1, behavior: 'smooth' });
    h.host.click();
    const stale = el('button', { 'data-scrollspy-index': '9' });
    h.host.append(stale);
    stale.click();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('uses a scrollable ancestor as the target and scrolls it', async () => {
    const box = document.body.appendChild(el('div'));
    box.style.overflowY = 'auto';
    tops.set(box, 100);
    box.scrollTo = vi.fn();
    const h = mount({}, box);
    expect(h.state().contained).toBe(true);
    expect(h.host.hasAttribute('data-contained')).toBe(true);
    h.entry(2).click();
    expect(box.scrollTo).toHaveBeenCalledWith({ top: 1000 - 100 + box.scrollTop + 1, behavior: 'smooth' });
    tops.set(h.a, 0).set(h.b, 50).set(h.c, 99);
    box.dispatchEvent(new Event('scroll'));
    expect(h.state().active).toBe(2);
  });

  it('re-measures after an enclosing transition, and when its inputs change', () => {
    const h = mount();
    tops.set(h.a, -600).set(h.b, -10);
    document.body.dispatchEvent(new Event('transitionend', { bubbles: true }));
    expect(h.state().active).toBe(1);
    tops.set(h.c, -5);
    h.b.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(h.state().active).toBe(1);

    const container = document.body.appendChild(el('div'));
    tops.set(container, 2000);
    h.setInputs({ scrollContainer: container });
    expect(h.state()).toMatchObject({ contained: true, active: 2 });
    h.setInputs({ label: 'Changed' });
  });

  it('rescans sections added later, keeping a nested scrollspy’s own', async () => {
    const h = mount();
    const nested = el('div', { 'data-scrollspy-root': '' }, el('h2', { 'data-scrollspy': '' }, 'Inner'));
    const extra = el('h2', { 'data-scrollspy': '' }, 'Appendix');
    tops.set(extra, 1500);
    h.content.append(nested, extra);
    await tick();
    expect(h.state().sections.map((s) => s.text)).toEqual(['Intro', 'Details', 'Notes', 'Appendix']);
  });

  it('scrolls the list to the active entry on a wide viewport', async () => {
    const h = mount();
    const nav = h.host.querySelector<HTMLElement>('nav')!;
    tops.set(nav, 100);
    tops.set(h.a, -2000).set(h.b, -1000).set(h.c, -10);
    document.dispatchEvent(new Event('scroll'));
    h.render();
    const navNow = h.host.querySelector<HTMLElement>('nav')!;
    tops.set(navNow, 100).set(h.entry(2), 300);
    await frame();
    // Scrolled down by the entry's overshoot (once per pending frame; the mock never moves it).
    expect(navNow.scrollTop).toBeGreaterThan(0);

    tops.set(h.a, -10).set(h.b, 500).set(h.c, 1000);
    document.dispatchEvent(new Event('scroll'));
    h.render();
    const navAgain = h.host.querySelector<HTMLElement>('nav')!;
    navAgain.scrollTop = 0;
    tops.set(navAgain, 100).set(h.entry(0), 0);
    await frame();
    expect(h.state().active).toBe(0);

    const narrow = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(400);
    tops.set(h.a, -2000).set(h.b, -10);
    document.dispatchEvent(new Event('scroll'));
    await frame();
    narrow.mockRestore();
    h.dispose();
  });
});
