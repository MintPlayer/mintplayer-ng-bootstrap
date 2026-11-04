import { afterEach, describe, expect, it } from 'vitest';
import { MpPriorityNav } from './generated';

void MpPriorityNav; // force the side-effect registration

/**
 * The Lit priority-nav front (#458 M7). The core's aria spec covers the bags; this pins the DOM
 * behaviour: items render inline and in the overflow, collapseAt moves them all into More (jsdom
 * is 1024px wide, below xxl), More toggles the disclosure, Escape and an action close it.
 */

async function settle(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await new Promise(requestAnimationFrame);
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

const ITEMS = [
  { key: 'home', label: 'Home', href: '/', priority: 1 },
  { key: 'docs', label: 'Docs', href: '/docs', priority: 2 },
];

function mount(collapseAt: string | null = null): MpPriorityNav {
  const el = document.createElement('mp-priority-nav') as MpPriorityNav;
  el.items = ITEMS;
  if (collapseAt) el.collapseAt = collapseAt as MpPriorityNav['collapseAt'];
  document.body.append(el);
  return el;
}

const more = (el: Element) => el.querySelector('button.priority-nav-more-toggle') as HTMLButtonElement;
const inline = (el: Element) => [...el.querySelectorAll('.priority-nav-strip .priority-nav-item')];
const shownInPanel = (el: Element) =>
  [...el.querySelectorAll('.priority-nav-overflow .priority-nav-overflow-item')]
    .filter((row) => !row.classList.contains('priority-nav-overflow-hidden'))
    .map((row) => row.textContent?.trim());

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-priority-nav', () => {
  it('is a named navigation landmark that renders every item as a default link', async () => {
    const el = mount();
    await settle(el);
    expect(el.getAttribute('role')).toBe('navigation');
    expect(el.getAttribute('aria-label')).toBe('Navigation');
    expect(inline(el).map((row) => row.querySelector('a')?.getAttribute('href'))).toEqual(['/', '/docs']);
    expect(el.hasAttribute('data-mp-hydrated')).toBe(true);
  });

  it('moves every item into the overflow below collapseAt and emits them', async () => {
    const el = mount('xxl');
    const changes: unknown[] = [];
    el.addEventListener('overflowchange', (e) => changes.push((e as CustomEvent).detail));
    await settle(el);
    expect(inline(el).every((row) => row.classList.contains('priority-nav-hidden'))).toBe(true);
    expect(shownInPanel(el)).toEqual(['Home', 'Docs']);
    expect(changes.at(-1)).toEqual(ITEMS);
  });

  it('toggles the disclosure from More, and Escape closes it again', async () => {
    const el = mount('xxl');
    await settle(el);
    more(el).click();
    await settle(el);
    expect(more(el).getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.priority-nav-overflow')?.classList.contains('priority-nav-overflow-open')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(el);
    expect(more(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes after activating a link in the overflow', async () => {
    const el = mount('xxl');
    await settle(el);
    more(el).click();
    await settle(el);
    const link = el.querySelector('.priority-nav-overflow a') as HTMLAnchorElement;
    link.addEventListener('click', (e) => e.preventDefault());
    link.click();
    await settle(el);
    expect(more(el).getAttribute('aria-expanded')).toBe('false');
  });
});
