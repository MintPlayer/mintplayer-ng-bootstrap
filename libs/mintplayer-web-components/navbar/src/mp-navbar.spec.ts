import { afterEach, describe, expect, it } from 'vitest';
import { MpDropdownItem, MpDropdownMenu } from '../../dropdown/src/generated';
import { MpNavbar } from './generated';
import { MpNavbarItem } from './generated';
import { MpNavbarNav } from './generated';

void MpNavbar; // force the side-effect registrations
void MpDropdownMenu;
void MpDropdownItem;
void MpNavbarItem;
void MpNavbarNav;

/**
 * The Lit navbar front (#437): light DOM, rendered from the template compiled
 * out of `@mintplayer/ui-core/navbar`. The core's own spec covers the bags;
 * this file pins what only the front does: the element is the `.navbar` root,
 * authored children land in the right part of the compiled template (and keep
 * their identity), late children are adopted, and `toggle()` drives the
 * checkbox, the ARIA state and the event together.
 */

async function settle(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

function mount(markup: string): MpNavbar {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.querySelector('mp-navbar') as MpNavbar;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-navbar', () => {
  it('is the navigation landmark itself, named by aria-label', async () => {
    const nav = mount('<mp-navbar aria-label="Main" color="body-tertiary"></mp-navbar>');
    await settle(nav);
    expect(nav.shadowRoot).toBeNull();
    expect(nav.getAttribute('role')).toBe('navigation');
    expect(nav.getAttribute('aria-label')).toBe('Main');
    expect(nav.classList.contains('navbar')).toBe(true);
  });

  it('keeps a consumer class on the host', async () => {
    const nav = mount('<mp-navbar class="mine"></mp-navbar>');
    await settle(nav);
    nav.expanded = true;
    await settle(nav);
    expect(nav.classList.contains('mine')).toBe(true);
    expect(nav.classList.contains('navbar')).toBe(true);
  });

  it('places the brand and the content, keeping node identity', async () => {
    const nav = mount('<mp-navbar><a slot="brand" href="/">Brand</a><mp-navbar-nav><mp-navbar-item><a href="/x">X</a></mp-navbar-item></mp-navbar-nav></mp-navbar>');
    const brand = nav.querySelector('a[slot="brand"]');
    const group = nav.querySelector('mp-navbar-nav');
    await settle(nav);
    expect(nav.querySelector('.navbar-brand')?.contains(brand)).toBe(true);
    expect(nav.querySelector('.navbar-collapse')?.contains(group)).toBe(true);
    expect(nav.querySelector('a[slot="brand"]')).toBe(brand);
  });

  it('renders no brand wrapper without a brand', async () => {
    const nav = mount('<mp-navbar><mp-navbar-nav></mp-navbar-nav></mp-navbar>');
    await settle(nav);
    expect(nav.querySelector('.navbar-brand')).toBeNull();
  });

  it('adopts a child appended after the first render into the collapse', async () => {
    const nav = mount('<mp-navbar></mp-navbar>');
    await settle(nav);
    const late = document.createElement('mp-navbar-nav');
    nav.append(late);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(nav);
    expect(nav.querySelector('.navbar-collapse')?.contains(late)).toBe(true);
  });

  it('toggle() flips the checkbox, aria-expanded and fires expandedchange', async () => {
    const nav = mount('<mp-navbar></mp-navbar>');
    await settle(nav);
    const events: boolean[] = [];
    nav.addEventListener('expandedchange', (e) => events.push((e as CustomEvent<{ expanded: boolean }>).detail.expanded));
    const toggle = nav.querySelector('input.navbar-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    nav.toggle();
    await settle(nav);
    expect(toggle.checked).toBe(true);
    expect(nav.expanded).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(events).toEqual([true]);

    nav.expanded = false;
    await settle(nav);
    expect(toggle.checked).toBe(false);
  });

  it('the toggle controls the collapse', async () => {
    const nav = mount('<mp-navbar></mp-navbar>');
    await settle(nav);
    const toggle = nav.querySelector('input.navbar-toggle') as HTMLInputElement;
    const collapse = nav.querySelector('.navbar-collapse') as HTMLElement;
    expect(collapse.id).not.toBe('');
    expect(toggle.getAttribute('aria-controls')).toBe(collapse.id);
    expect((nav.querySelector('label.navbar-toggler') as HTMLLabelElement).htmlFor).toBe(toggle.id);
  });
});

describe('mp-navbar-nav / mp-navbar-item', () => {
  it('apply their bags to themselves', async () => {
    const nav = mount('<mp-navbar><mp-navbar-nav align="end"><mp-navbar-item active><a href="/">A</a></mp-navbar-item></mp-navbar-nav></mp-navbar>');
    await settle(nav);
    const group = nav.querySelector('mp-navbar-nav') as MpNavbarNav;
    const item = nav.querySelector('mp-navbar-item') as MpNavbarItem;
    await settle(group);
    await settle(item);
    expect(group.classList.contains('navbar-nav')).toBe(true);
    expect(group.classList.contains('nav-end')).toBe(true);
    expect(item.classList.contains('nav-item')).toBe(true);
    expect(item.getAttribute('aria-current')).toBe('page');
  });
});

describe('mp-dropdown-menu in a navbar group', () => {
  it('renders a native details whose summary is the label and whose panel holds the items', async () => {
    const nav = mount(
      '<mp-navbar><mp-navbar-nav><mp-dropdown-menu label="Products"><mp-dropdown-item><a href="/w">W</a></mp-dropdown-item></mp-dropdown-menu></mp-navbar-nav></mp-navbar>',
    );
    await settle(nav);
    const menu = nav.querySelector('mp-dropdown-menu') as MpDropdownMenu;
    await settle(menu);
    const details = menu.querySelector('details') as HTMLDetailsElement;
    expect(details.classList.contains('nav-item')).toBe(true);
    expect(details.querySelector('summary')?.textContent?.trim()).toBe('Products');
    const panel = details.querySelector('.dropdown-menu') as HTMLElement;
    const item = panel.querySelector('mp-dropdown-item') as MpDropdownItem;
    await settle(item);
    expect(item.classList.contains('dropdown-item')).toBe(true);
    // Disclosure navigation: never an ARIA menu.
    expect(panel.getAttribute('role')).toBeNull();
    expect(item.getAttribute('role')).toBeNull();
  });

  it('a labelled slot wins over the label attribute', async () => {
    const nav = mount('<mp-navbar><mp-navbar-nav><mp-dropdown-menu label="Text"><b slot="labelTemplate">Markup</b></mp-dropdown-menu></mp-navbar-nav></mp-navbar>');
    await settle(nav);
    const menu = nav.querySelector('mp-dropdown-menu') as MpDropdownMenu;
    await settle(menu);
    expect(menu.querySelector('summary')?.textContent?.trim()).toBe('Markup');
  });

  it('nested menus are submenus with their own exclusive group', async () => {
    const nav = mount(
      '<mp-navbar><mp-navbar-nav><mp-dropdown-menu label="A"><mp-dropdown-menu label="B"></mp-dropdown-menu></mp-dropdown-menu></mp-navbar-nav></mp-navbar>',
    );
    await settle(nav);
    const [outer, inner] = [...nav.querySelectorAll('mp-dropdown-menu')] as MpDropdownMenu[];
    await settle(outer);
    await settle(inner);
    const outerDetails = outer.querySelector(':scope > details') as HTMLDetailsElement;
    const innerDetails = inner.querySelector(':scope > details') as HTMLDetailsElement;
    expect(innerDetails.classList.contains('dropdown-submenu')).toBe(true);
    expect(innerDetails.getAttribute('name')).not.toBe(outerDetails.getAttribute('name'));
    expect(outerDetails.querySelector('.dropdown-menu')?.contains(inner)).toBe(true);
  });
});
