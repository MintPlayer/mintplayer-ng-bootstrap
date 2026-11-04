import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpScrollspy } from './generated';

void MpScrollspy; // force the side-effect registration

/**
 * The Lit scrollspy front (#458 M7). The core's spec covers the bags and the
 * geometry; this pins the DOM behaviour: the list is built from the content's
 * `data-scrollspy` elements once attached, a nested scrollspy keeps its own,
 * late sections are picked up, and a click scrolls the window.
 */

async function settle(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

function mount(markup: string): MpScrollspy {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.querySelector('mp-scrollspy') as MpScrollspy;
}

const entries = (spy: Element) =>
  [...spy.querySelectorAll(':scope > .spy button')].map((button) => button.textContent?.trim());

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('mp-scrollspy', () => {
  it('lists the marked sections in a named navigation, the first one current', async () => {
    // jsdom lays nothing out: every top is 0, so every section would count as passed.
    // Put the sections where a browser would: the first at the top, the second below the fold.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: this.textContent === 'Details' ? 2000 : 0 } as DOMRect;
    });
    const spy = mount('<mp-scrollspy><h2 data-scrollspy>Intro</h2><p>…</p><h3 data-scrollspy>Details</h3><h2>Unmarked</h2></mp-scrollspy>');
    await settle(spy);
    await settle(spy);
    const nav = spy.querySelector(':scope > nav.spy') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe('Section navigation');
    expect(entries(spy)).toEqual(['Intro', 'Details']);
    const [intro, details] = [...nav.querySelectorAll('button')];
    expect(intro.getAttribute('aria-current')).toBe('location');
    expect(details.classList.contains('scrollspy-level-3')).toBe(true);
    expect(spy.querySelector(':scope > .scrollspy-content > h2')?.textContent).toBe('Intro');
  });

  it('leaves a nested scrollspy its own sections', async () => {
    const outer = mount(
      '<mp-scrollspy><h2 data-scrollspy>Outer</h2><mp-scrollspy><h2 data-scrollspy>Inner</h2></mp-scrollspy></mp-scrollspy>',
    );
    await settle(outer);
    const inner = outer.querySelector('mp-scrollspy') as MpScrollspy;
    await settle(inner);
    await settle(outer);
    expect(entries(outer)).toEqual(['Outer']);
    expect(entries(inner)).toEqual(['Inner']);
  });

  it('picks up a section added after the first render', async () => {
    const spy = mount('<mp-scrollspy><h2 data-scrollspy>First</h2></mp-scrollspy>');
    await settle(spy);
    const late = document.createElement('h2');
    late.setAttribute('data-scrollspy', '');
    late.textContent = 'Second';
    spy.querySelector('.scrollspy-content')!.append(late);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(spy);
    expect(entries(spy)).toEqual(['First', 'Second']);
  });

  it('scrolls the window to a clicked section, past the offset', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const spy = mount('<mp-scrollspy offset="60"><h2 data-scrollspy>Only</h2></mp-scrollspy>');
    await settle(spy);
    await settle(spy);
    (spy.querySelector('.spy button') as HTMLButtonElement).click();
    // jsdom lays nothing out: top 0, scrollY 0, so 0 - 60 + 0 + 1.
    expect(scrollTo).toHaveBeenCalledWith({ top: -59, behavior: 'smooth' });
  });
});
