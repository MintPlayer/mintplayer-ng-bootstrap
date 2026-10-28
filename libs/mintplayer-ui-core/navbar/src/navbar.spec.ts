import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachNavbar,
  closeNavbarDropdowns,
  connectNavbar,
  connectNavbarDropdown,
  connectNavbarItem,
  connectNavbarNav,
  navbarTheme,
  setNavbarExpanded,
  type NavbarBag,
} from './navbar';

/** Apply a bag the way the fronts do: null/false drops, true is an empty attribute. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, bag: NavbarBag = {}, ...children: (Node | string)[]) {
  const node = document.createElement(tag);
  Object.entries(bag)
    .filter(([, value]) => value !== null && value !== false)
    .map(([name, value]) => node.setAttribute(name, value === true ? '' : String(value)));
  node.append(...children);
  return node;
}

function link(text: string, href: string | null = `#${text}`) {
  const a = document.createElement('a');
  if (href !== null) a.href = href;
  a.textContent = text;
  return a;
}

function dropdown(depth: number, label: string, ...items: Node[]) {
  const view = connectNavbarDropdown({ depth });
  return el('details', view.details, el('summary', view.summary, label), el('div', view.panel, ...items));
}

const menuItem = (...children: Node[]) => el('div', connectNavbarItem({ inMenu: true }), ...children);

function mount() {
  const view = connectNavbar({ id: 'n', hydrated: true });
  const sub = dropdown(1, 'More', menuItem(link('deep')));
  const top = dropdown(0, 'Menu', menuItem(link('a')), menuItem(link('b')), sub);
  const root = el(
    'nav',
    view.root,
    el('input', view.toggle),
    el('label', view.toggler),
    el('div', view.collapse, el('div', view.inner, el('div', connectNavbarNav(), el('div', connectNavbarItem(), link('home')), top))),
  );
  document.body.append(root);
  return { root, top, sub, toggle: root.querySelector<HTMLInputElement>('.navbar-toggle')! };
}

const press = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const summary = (details: HTMLElement) => details.querySelector<HTMLElement>(':scope > summary')!;
const anchor = (root: HTMLElement, text: string) => [...root.querySelectorAll('a')].find((a) => a.textContent === text)!;

afterEach(() => document.body.replaceChildren());

describe('connectNavbar', () => {
  it('wires the checkbox, toggler and collapse from the root id', () => {
    const view = connectNavbar({ id: 'n', hydrated: false });
    expect(view.toggle).toMatchObject({ id: 'n-toggle', type: 'checkbox', 'aria-controls': 'n-collapse', 'aria-label': 'Toggle navigation' });
    expect(view.toggler).toMatchObject({ for: 'n-toggle', 'aria-hidden': 'true' });
    expect(view.collapse['id']).toBe('n-collapse');
    expect(view.root).toMatchObject({ 'data-mps': 'navbar', 'data-breakpoint': 'md', 'aria-label': 'Main navigation' });
  });

  it('keeps the native checkbox role until hydrated, then presents a button with live aria-expanded', () => {
    const server = connectNavbar({ id: 'n', hydrated: false, expanded: true });
    expect(server.toggle['role']).toBeNull();
    expect(server.toggle['aria-expanded']).toBeNull();
    expect(server.toggle['checked']).toBe(true);
    const client = connectNavbar({ id: 'n', hydrated: true, expanded: false });
    expect(client.toggle).toMatchObject({ role: 'button', 'aria-expanded': 'false', checked: null });
  });

  it('builds the Bootstrap classes from breakpoint, colour and positioning', () => {
    expect(connectNavbar({ id: 'n', hydrated: false, breakpoint: 'lg', color: 'primary', positioning: 'fixed' }).root['class']).toBe(
      'navbar navbar-expand-lg bg-primary fixed-top',
    );
    expect(connectNavbar({ id: 'n', hydrated: false, breakpoint: 'xs' }).root['class']).toBe('navbar navbar-expand');
  });

  it('localizes both names', () => {
    const view = connectNavbar({ id: 'n', hydrated: false, labels: { nav: 'Hoofdmenu', toggle: 'Menu tonen' } });
    expect(view.root['aria-label']).toBe('Hoofdmenu');
    expect(view.toggle['aria-label']).toBe('Menu tonen');
  });
});

describe('navbarTheme', () => {
  it('gives solid colours light text and leaves adaptive ones to the page', () => {
    expect(navbarTheme('primary')).toBe('dark');
    expect(navbarTheme('light')).toBe('light');
    expect(navbarTheme('body-tertiary')).toBeNull();
    expect(navbarTheme(null)).toBeNull();
  });
});

describe('connectNavbarDropdown and items', () => {
  it('names the dropdowns of one depth alike, and never gives the panel or summary a role', () => {
    const top = connectNavbarDropdown({ depth: 0, active: true });
    const sub = connectNavbarDropdown({ depth: 1 });
    expect(top.details).toMatchObject({ class: 'nav-item dropdown', name: 'mp-navbar-0' });
    expect(top.summary['class']).toBe('nav-link dropdown-toggle active');
    expect(sub.details).toMatchObject({ class: 'dropdown dropdown-submenu', name: 'mp-navbar-1' });
    expect(sub.summary['class']).toBe('dropdown-item dropdown-toggle');
    expect(top.summary['role']).toBeUndefined();
    expect(top.panel['role']).toBeNull();
  });

  it('marks the current page and disabled items', () => {
    expect(connectNavbarItem({ active: true })).toMatchObject({ class: 'nav-item active', 'aria-current': 'page' });
    expect(connectNavbarItem({ inMenu: true, disabled: true })).toMatchObject({ class: 'dropdown-item disabled', 'aria-disabled': 'true' });
    expect(connectNavbarNav('end')['class']).toBe('navbar-nav nav-end');
  });
});

describe('attachNavbar', () => {
  it('reports checkbox changes, and Enter toggles the checkbox', () => {
    const { root, toggle } = mount();
    const onExpandedChange = vi.fn();
    const dispose = attachNavbar(root, { onExpandedChange });
    toggle.click();
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    press(toggle, 'Enter');
    expect(toggle.checked).toBe(false);
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
    press(toggle, 'a');
    expect(onExpandedChange).toHaveBeenCalledTimes(2);
    dispose();
  });

  it('a navigation closes every dropdown and the collapse, a summary does not', () => {
    const { root, top, sub, toggle } = mount();
    const onExpandedChange = vi.fn();
    attachNavbar(root, { onExpandedChange });
    setNavbarExpanded(root, true);
    (top as HTMLDetailsElement).open = true;
    (sub as HTMLDetailsElement).open = true;
    summary(sub).click();
    expect(toggle.checked).toBe(true);
    anchor(root, 'deep').addEventListener('click', (e) => e.preventDefault());
    anchor(root, 'deep').click();
    expect((top as HTMLDetailsElement).open).toBe(false);
    expect((sub as HTMLDetailsElement).open).toBe(false);
    expect(toggle.checked).toBe(false);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it('ArrowDown on a trigger opens it and focuses the first link', () => {
    const { root, top } = mount();
    attachNavbar(root);
    summary(top).focus();
    press(summary(top), 'ArrowDown');
    expect((top as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement).toBe(anchor(root, 'a'));
  });

  it('arrows rove the panel, as a shortcut over the native tab order', () => {
    const { root, top } = mount();
    attachNavbar(root);
    (top as HTMLDetailsElement).open = true;
    anchor(root, 'a').focus();
    press(anchor(root, 'a'), 'ArrowDown');
    expect(document.activeElement).toBe(anchor(root, 'b'));
    press(anchor(root, 'b'), 'End');
    expect(document.activeElement).toBe(summary(top.querySelector('.dropdown-submenu')!));
    expect(anchor(root, 'a').hasAttribute('tabindex')).toBe(false);
  });

  it('ArrowRight enters a submenu, ArrowLeft leaves it', () => {
    const { root, sub } = mount();
    attachNavbar(root);
    press(summary(sub), 'ArrowRight');
    expect((sub as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement).toBe(anchor(root, 'deep'));
    press(anchor(root, 'deep'), 'ArrowLeft');
    expect((sub as HTMLDetailsElement).open).toBe(false);
    expect(document.activeElement).toBe(summary(sub));
  });

  it('Escape closes only the innermost open dropdown and returns focus to its trigger', () => {
    const { root, top, sub } = mount();
    attachNavbar(root);
    (top as HTMLDetailsElement).open = true;
    (sub as HTMLDetailsElement).open = true;
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    press(anchor(root, 'deep'), 'Escape');
    expect((sub as HTMLDetailsElement).open).toBe(false);
    expect((top as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement).toBe(summary(sub));
    expect(outer).not.toHaveBeenCalled();
    // Nothing open: Escape continues to the page (a dialog around the bar).
    (top as HTMLDetailsElement).open = false;
    press(anchor(root, 'home'), 'Escape');
    expect(outer).toHaveBeenCalledTimes(1);
    document.removeEventListener('keydown', outer);
  });

  it('closes on a press outside, but not on one inside the open dropdown', () => {
    const { root, top } = mount();
    attachNavbar(root);
    (top as HTMLDetailsElement).open = true;
    anchor(root, 'a').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect((top as HTMLDetailsElement).open).toBe(true);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect((top as HTMLDetailsElement).open).toBe(false);
  });

  it('a mouse press on a trigger toggles at press time and swallows its click', () => {
    const { root, top, sub } = mount();
    attachNavbar(root);
    const mousedown = (target: Element) =>
      target.dispatchEvent(Object.assign(new Event('pointerdown', { bubbles: true }), { pointerType: 'mouse', button: 0 }));

    mousedown(summary(top));
    expect((top as HTMLDetailsElement).open).toBe(true);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    summary(top).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true); // the native toggle would undo the press

    // A submenu trigger keeps its ancestors open.
    mousedown(summary(sub));
    expect((sub as HTMLDetailsElement).open).toBe(true);
    expect((top as HTMLDetailsElement).open).toBe(true);

    // A drifted press: the click lands elsewhere and is not swallowed.
    mousedown(summary(top));
    expect((top as HTMLDetailsElement).open).toBe(false);
    const drifted = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor(root, 'home').dispatchEvent(drifted);
    expect(drifted.defaultPrevented).toBe(false);
  });

  it('stops listening once disposed', () => {
    const { root, top, toggle } = mount();
    const onExpandedChange = vi.fn();
    attachNavbar(root, { onExpandedChange })();
    (top as HTMLDetailsElement).open = true;
    toggle.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(onExpandedChange).not.toHaveBeenCalled();
    expect((top as HTMLDetailsElement).open).toBe(true);
    closeNavbarDropdowns(root);
    expect((top as HTMLDetailsElement).open).toBe(false);
  });
});
