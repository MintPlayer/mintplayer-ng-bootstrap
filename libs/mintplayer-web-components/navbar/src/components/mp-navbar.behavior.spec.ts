import { afterEach, describe, expect, it, vi } from 'vitest';
import { LitElement } from 'lit';
import { MpNavbar } from './mp-navbar';
import { MpNavbarDropdown } from './mp-navbar-dropdown';
import { MpNavbarBrand } from './mp-navbar-brand';
import { MpNavbarItem } from './mp-navbar-item';
import '@mintplayer/web-components/dropdown-menu';
import type { NavbarExpandedChangeEventDetail } from '../types';

void MpNavbar;
void MpNavbarDropdown;
void MpNavbarBrand;
void MpNavbarItem;

async function flush(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function mount<T extends HTMLElement>(markup: string, selector: string): Promise<T> {
  document.body.innerHTML = markup;
  const els = Array.from(document.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('*'))
    .filter((e) => e.tagName.includes('-'));
  await Promise.all(els.map((e) => flush(e)));
  await new Promise((r) => setTimeout(r, 0));
  return document.querySelector(selector) as T;
}

/** A controllable MediaQueryList: which query matches is the test's choice, no geometry. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches,
    media: '',
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  const spy = vi.fn(() => mql as unknown as MediaQueryList);
  vi.stubGlobal('matchMedia', spy);
  return {
    spy,
    listeners,
    fire(next: boolean) {
      mql.matches = next;
      [...listeners].map((fn) => fn());
    },
  };
}

const MENU = `<mp-dropdown-menu><li class="dropdown-item"><a href="/one">One</a></li><li class="dropdown-item"><a href="/two">Two</a></li></mp-dropdown-menu>`;

function key(target: Element, k: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(ev);
  return ev;
}
const mousedown = (target: Element) =>
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));

const toggleOf = (nav: MpNavbar) => nav.shadowRoot!.querySelector<HTMLInputElement>('.navbar-toggle')!;
const triggerOf = (dd: MpNavbarDropdown) => dd.shadowRoot!.querySelector<HTMLElement>('.dropdown-toggle')!;

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('mp-navbar colour, breakpoint and JS marker', () => {
  it('marks JS as present on connect', async () => {
    const nav = await mount<MpNavbar>('<mp-navbar></mp-navbar>', 'mp-navbar');
    expect(nav.hasAttribute('data-js')).toBe(true);
  });

  it.each([
    ['primary', 'dark'],
    ['dark', 'dark'],
    ['light', 'light'],
    ['white', 'light'],
    ['body', null],
    ['body-tertiary', null],
    ['transparent', null],
  ])('color="%s" sets data-bs-theme to %s', async (color, theme) => {
    const nav = await mount<MpNavbar>(`<mp-navbar color="${color}"></mp-navbar>`, 'mp-navbar');
    expect(nav.getAttribute('data-bs-theme')).toBe(theme);
  });

  it('drops the contrast theme when the colour becomes adaptive or is removed', async () => {
    const nav = await mount<MpNavbar>('<mp-navbar color="primary"></mp-navbar>', 'mp-navbar');
    nav.setAttribute('color', 'body');
    expect(nav.hasAttribute('data-bs-theme')).toBe(false);
    nav.setAttribute('color', 'light');
    nav.removeAttribute('color');
    expect(nav.hasAttribute('data-bs-theme')).toBe(false);
  });

  it.each([
    [null, 'md', '768px'],
    ['xs', 'xs', '0px'],
    ['lg', 'lg', '992px'],
    ['xxl', 'xxl', '1400px'],
    ['bogus', 'bogus', '768px'],
  ])('breakpoint=%s publishes data-breakpoint=%s and %s', async (bp, name, px) => {
    const attr = bp === null ? '' : ` breakpoint="${bp}"`;
    const nav = await mount<MpNavbar>(`<mp-navbar${attr}></mp-navbar>`, 'mp-navbar');
    expect(nav.getAttribute('data-breakpoint')).toBe(name);
    expect(nav.style.getPropertyValue('--mp-navbar-breakpoint')).toBe(px);
  });

  it('re-publishes on a breakpoint change and keeps it across a reconnect', async () => {
    const nav = await mount<MpNavbar>('<mp-navbar></mp-navbar>', 'mp-navbar');
    nav.setAttribute('breakpoint', 'sm');
    expect(nav.style.getPropertyValue('--mp-navbar-breakpoint')).toBe('576px');
    nav.remove();
    document.body.appendChild(nav);
    expect(nav.getAttribute('data-breakpoint')).toBe('sm');
    expect(nav.style.getPropertyValue('--mp-navbar-breakpoint')).toBe('576px');
  });

  it('re-renders the landmark label when aria-label changes', async () => {
    const nav = await mount<MpNavbar>('<mp-navbar></mp-navbar>', 'mp-navbar');
    nav.setAttribute('aria-label', 'Site');
    await flush(nav);
    expect(nav.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('Site');
  });
});

describe('mp-navbar collapse state', () => {
  it('a native checkbox change emits expandedchange with the new state', async () => {
    const nav = await mount<MpNavbar>('<mp-navbar></mp-navbar>', 'mp-navbar');
    const seen: boolean[] = [];
    nav.addEventListener('expandedchange', (e) =>
      seen.push((e as CustomEvent<NavbarExpandedChangeEventDetail>).detail.expanded),
    );
    const input = toggleOf(nav);
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(seen).toEqual([true]);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(nav.expanded).toBe(true);
  });

  it('toggle() without a force flips the state and emits', async () => {
    const nav = await mount<MpNavbar>('<mp-navbar></mp-navbar>', 'mp-navbar');
    const seen: boolean[] = [];
    nav.addEventListener('expandedchange', (e) =>
      seen.push((e as CustomEvent<NavbarExpandedChangeEventDetail>).detail.expanded),
    );
    nav.toggle();
    nav.toggle();
    expect(seen).toEqual([true, false]);
  });

  it('non-Enter keys on the toggle are left to the checkbox', async () => {
    const nav = await mount<MpNavbar>('<mp-navbar></mp-navbar>', 'mp-navbar');
    expect(key(toggleOf(nav), 'a').defaultPrevented).toBe(false);
    expect(nav.expanded).toBe(false);
  });

  it('toggle() before the first render is a no-op, and expanded reads the attribute', () => {
    const nav = document.createElement('mp-navbar') as MpNavbar;
    nav.toggle(true);
    expect(nav.expanded).toBe(false);
  });

  it('clicking a nav link closes every dropdown and the collapse', async () => {
    const nav = await mount<MpNavbar>(
      `<mp-navbar expanded><mp-navbar-item><a href="/x" id="link">X</a></mp-navbar-item>
        <mp-navbar-dropdown><span slot="label">P</span>${MENU}</mp-navbar-dropdown></mp-navbar>`,
      'mp-navbar',
    );
    const dd = nav.querySelector('mp-navbar-dropdown') as MpNavbarDropdown;
    mousedown(triggerOf(dd));
    expect(dd.hasAttribute('data-open')).toBe(true);
    const seen: boolean[] = [];
    nav.addEventListener('expandedchange', (e) =>
      seen.push((e as CustomEvent<NavbarExpandedChangeEventDetail>).detail.expanded),
    );
    (nav.querySelector('#link') as HTMLElement).click();
    expect(dd.hasAttribute('data-open')).toBe(false);
    expect(toggleOf(nav).checked).toBe(false);
    expect(seen).toEqual([false]);
  });

  it('clicking a dropdown trigger or an href-less anchor does not collapse the bar', async () => {
    const nav = await mount<MpNavbar>(
      '<mp-navbar expanded><a class="dropdown-toggle" href="#" id="t">T</a><a id="plain">P</a></mp-navbar>',
      'mp-navbar',
    );
    (nav.querySelector('#t') as HTMLElement).click();
    (nav.querySelector('#plain') as HTMLElement).click();
    expect(toggleOf(nav).checked).toBe(true);
  });

  it('stops dismissing on link clicks once disconnected', async () => {
    const nav = await mount<MpNavbar>('<mp-navbar expanded><a href="/x" id="l">X</a></mp-navbar>', 'mp-navbar');
    const input = toggleOf(nav);
    nav.remove();
    (nav.querySelector('#l') as HTMLElement).click();
    expect(input.checked).toBe(true);
  });
});

describe('mp-navbar-dropdown (first level)', () => {
  const markup = (bp = '') =>
    `<mp-navbar${bp}><mp-navbar-dropdown><span slot="label">P</span>${MENU}</mp-navbar-dropdown></mp-navbar>`;

  it('publishes the enclosing navbar breakpoint as data-expand, defaulting to md', async () => {
    const dd = await mount<MpNavbarDropdown>(markup(' breakpoint="xl"'), 'mp-navbar-dropdown');
    expect(dd.getAttribute('data-expand')).toBe('xl');
    const lone = await mount<MpNavbarDropdown>('<mp-navbar-dropdown></mp-navbar-dropdown>', 'mp-navbar-dropdown');
    expect(lone.getAttribute('data-expand')).toBe('md');
    expect(lone.hasAttribute('data-submenu')).toBe(false);
  });

  it('builds its matchMedia query from the breakpoint px, falling back to 768', async () => {
    const mm = stubMatchMedia(false);
    await mount(markup(' breakpoint="lg"'), 'mp-navbar-dropdown');
    await mount(markup(' breakpoint="huge"'), 'mp-navbar-dropdown');
    expect(mm.spy.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      '(min-width: 992px)',
      '(min-width: 768px)',
    ]);
  });

  it('a trigger press toggles the inline panel and aria-expanded', async () => {
    const dd = await mount<MpNavbarDropdown>(markup(), 'mp-navbar-dropdown');
    mousedown(triggerOf(dd));
    await flush(dd);
    expect(dd.hasAttribute('data-open')).toBe(true);
    expect(triggerOf(dd).getAttribute('aria-expanded')).toBe('true');
    mousedown(triggerOf(dd));
    await flush(dd);
    expect(dd.hasAttribute('data-open')).toBe(false);
    expect(triggerOf(dd).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on a mousedown outside, but not on one inside its menu', async () => {
    const dd = await mount<MpNavbarDropdown>(markup() + '<p id="out">out</p>', 'mp-navbar-dropdown');
    mousedown(triggerOf(dd));
    mousedown(dd.querySelector('.dropdown-item')!);
    expect(dd.hasAttribute('data-open')).toBe(true);
    mousedown(document.getElementById('out')!);
    expect(dd.hasAttribute('data-open')).toBe(false);
  });

  it.each(['Enter', ' ', 'Spacebar'])('%j on the trigger toggles the panel', async (k) => {
    const dd = await mount<MpNavbarDropdown>(markup(), 'mp-navbar-dropdown');
    expect(key(triggerOf(dd), k).defaultPrevented).toBe(true);
    expect(dd.hasAttribute('data-open')).toBe(true);
  });

  it('ignores other keys on the trigger', async () => {
    const dd = await mount<MpNavbarDropdown>(markup(), 'mp-navbar-dropdown');
    expect(key(triggerOf(dd), 'x').defaultPrevented).toBe(false);
    expect(dd.hasAttribute('data-open')).toBe(false);
  });

  it('ArrowDown on an already-open dropdown keeps it open and focuses the first item', async () => {
    const dd = await mount<MpNavbarDropdown>(markup(), 'mp-navbar-dropdown');
    mousedown(triggerOf(dd));
    key(triggerOf(dd), 'ArrowDown');
    expect(dd.hasAttribute('data-open')).toBe(true);
    expect(document.activeElement!.textContent).toBe('One');
  });

  it('ArrowDown finds a menu wrapped by a framework host element', async () => {
    const dd = await mount<MpNavbarDropdown>(
      `<mp-navbar-dropdown><span slot="label">P</span><bs-dropdown-menu>${MENU}</bs-dropdown-menu></mp-navbar-dropdown>`,
      'mp-navbar-dropdown',
    );
    key(triggerOf(dd), 'ArrowDown');
    expect(document.activeElement!.textContent).toBe('One');
  });

  it('ArrowDown focuses a bare item itself when it has no inner control', async () => {
    const dd = await mount<MpNavbarDropdown>(
      '<mp-navbar-dropdown><span slot="label">P</span><mp-dropdown-menu><li class="dropdown-item">Bare</li></mp-dropdown-menu></mp-navbar-dropdown>',
      'mp-navbar-dropdown',
    );
    key(triggerOf(dd), 'ArrowDown');
    expect(document.activeElement).toBe(dd.querySelector('.dropdown-item'));
  });

  it('ArrowDown with no menu slotted opens without moving focus', async () => {
    const dd = await mount<MpNavbarDropdown>(
      '<mp-navbar-dropdown><span slot="label">P</span><div>no menu</div></mp-navbar-dropdown>',
      'mp-navbar-dropdown',
    );
    key(triggerOf(dd), 'ArrowDown');
    expect(dd.hasAttribute('data-open')).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });

  it('Escape on a closed dropdown lets the event continue to its ancestors', async () => {
    const dd = await mount<MpNavbarDropdown>(markup(), 'mp-navbar-dropdown');
    const reached = vi.fn();
    document.body.addEventListener('keydown', reached);
    key(triggerOf(dd), 'Escape');
    document.body.removeEventListener('keydown', reached);
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it('stops listening for outside presses and Escape once disconnected', async () => {
    const dd = await mount<MpNavbarDropdown>(markup(), 'mp-navbar-dropdown');
    mousedown(triggerOf(dd));
    const remove = vi.spyOn(document, 'removeEventListener');
    dd.closest('mp-navbar')!.remove();
    expect(remove).toHaveBeenCalledWith('mousedown', expect.any(Function), true);
    expect(key(dd, 'Escape').defaultPrevented).toBe(false);
  });
});

describe('mp-navbar-dropdown as a submenu', () => {
  const markup = `<mp-navbar><mp-navbar-dropdown id="top"><span slot="label">P</span>
    <mp-dropdown-menu><li class="dropdown-item">
      <mp-navbar-dropdown id="sub"><span slot="label">More</span>${MENU}</mp-navbar-dropdown>
    </li></mp-dropdown-menu></mp-navbar-dropdown></mp-navbar>`;

  it('marks itself data-submenu when nested in a menu', async () => {
    const sub = await mount<MpNavbarDropdown>(markup, '#sub');
    expect(sub.hasAttribute('data-submenu')).toBe(true);
    expect((document.getElementById('top') as HTMLElement).hasAttribute('data-submenu')).toBe(false);
  });

  it('opens inline in narrow mode (no wide media match)', async () => {
    stubMatchMedia(false);
    const sub = await mount<MpNavbarDropdown>(markup, '#sub');
    mousedown(triggerOf(sub));
    expect(sub.hasAttribute('data-open')).toBe(true);
    expect(sub.hasAttribute('data-menu-open')).toBe(false);
  });

  it('opens as an overlay in wide mode, and closes both paths via close()', async () => {
    stubMatchMedia(true);
    const sub = await mount<MpNavbarDropdown>(markup, '#sub');
    mousedown(triggerOf(sub));
    await flush(sub);
    expect(sub.hasAttribute('data-menu-open')).toBe(true);
    expect(sub.hasAttribute('data-open')).toBe(false);
    expect(triggerOf(sub).getAttribute('aria-expanded')).toBe('true');
    sub.close();
    expect(sub.hasAttribute('data-menu-open')).toBe(false);
  });

  it('crossing the breakpoint closes an open submenu', async () => {
    const mm = stubMatchMedia(false);
    const sub = await mount<MpNavbarDropdown>(markup, '#sub');
    mousedown(triggerOf(sub));
    expect(sub.hasAttribute('data-open')).toBe(true);
    mm.fire(true);
    expect(sub.hasAttribute('data-open')).toBe(false);
  });

  it('crossing the breakpoint also closes a first-level dropdown', async () => {
    const mm = stubMatchMedia(true);
    const top = await mount<MpNavbarDropdown>(markup, '#top');
    mousedown(triggerOf(top));
    expect(top.hasAttribute('data-open')).toBe(true);
    mm.fire(false);
    expect(top.hasAttribute('data-open')).toBe(false);
  });

  it('removes its media listener on disconnect', async () => {
    const mm = stubMatchMedia(false);
    await mount(markup, '#sub');
    expect(mm.listeners.size).toBe(2);
    document.body.innerHTML = '';
    expect(mm.listeners.size).toBe(0);
  });
});

describe('navbar sub-elements', () => {
  it.each([
    ['mp-navbar-brand', MpNavbarBrand],
    ['mp-navbar-item', MpNavbarItem],
  ])('%s projects its content through a default slot', async (tag) => {
    const el = await mount<LitElement>(`<${tag}><a href="/">x</a></${tag}>`, tag);
    expect(el.shadowRoot!.querySelectorAll('slot:not([name])')).toHaveLength(1);
    expect(el.shadowRoot!.querySelector('slot')!.assignedNodes()[0]).toBe(el.querySelector('a'));
  });
});

describe('navbar DSD handoff', () => {
  function upgradeWithStaleShadow(tag: string, ctor: CustomElementConstructor): LitElement {
    const el = document.createElement(tag);
    const root = el.attachShadow({ mode: 'open' });
    const stale = document.createElement('p');
    stale.className = 'ssr-chrome';
    root.appendChild(stale);
    document.body.appendChild(el);
    customElements.define(tag, ctor);
    return el as LitElement;
  }

  const hydrating = <T extends typeof LitElement>(Base: T) =>
    class extends (Base as typeof LitElement) {
      static override get observedAttributes(): string[] {
        return [...super.observedAttributes, 'defer-hydration'];
      }
    } as unknown as CustomElementConstructor;

  it.each([
    ['mp-navbar', MpNavbar],
    ['mp-navbar-item', MpNavbarItem],
  ])('%s clears stale SSR chrome when hydrate support is absent', async (tag, Base) => {
    const el = upgradeWithStaleShadow(`${tag}-dsd-plain`, class extends (Base as typeof LitElement) {} as unknown as CustomElementConstructor);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.ssr-chrome')).toBeNull();
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull();
  });

  it.each([
    ['mp-navbar', MpNavbar],
    ['mp-navbar-brand', MpNavbarBrand],
  ])('%s keeps the DSD for lit when hydrate support is active', async (tag, Base) => {
    const el = upgradeWithStaleShadow(`${tag}-dsd-hydrating`, hydrating(Base));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.ssr-chrome')).not.toBeNull();
  });
});
