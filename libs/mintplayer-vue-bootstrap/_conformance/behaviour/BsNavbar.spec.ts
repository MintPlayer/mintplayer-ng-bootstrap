import { describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';

import BsDropdownMenu from '../../dropdown-menu/src/BsDropdownMenu.vue';
import BsNavbar from '../../navbar/src/BsNavbar.vue';
import BsNavbarDropdown from '../../navbar/src/BsNavbarDropdown.vue';
import BsNavbarItem from '../../navbar/src/BsNavbarItem.vue';

import { mountEl, mountWrapper } from './harness';

/** The navbar and dropdown-menu fronts render the markup of their headless cores. */

describe('BsDropdownMenu — markup from the headless core', () => {
  it('renders the scoped .dropdown-menu list with no height cap by default', () => {
    const { el } = mountEl(BsDropdownMenu, 'ul');
    expect(el.classList).toContain('dropdown-menu');
    expect(el.getAttribute('data-mps')).toBe('dropdown-menu');
    expect(el.style.getPropertyValue('--mp-dropdown-max-height')).toBe('');
  });

  // Zero is a legitimate cap and must not be dropped the way an unset value is.
  it('writes maxHeight as the height-cap custom property, zero included', () => {
    const capped = mountEl(BsDropdownMenu, 'ul', { props: { maxHeight: 240 } }).el;
    expect(capped.style.getPropertyValue('--mp-dropdown-max-height')).toBe('240px');
    const zero = mountEl(BsDropdownMenu, 'ul', { props: { maxHeight: 0 } }).el;
    expect(zero.style.getPropertyValue('--mp-dropdown-max-height')).toBe('0px');
  });
});

describe('BsNavbar — markup from the headless core', () => {
  const toggle = (nav: Element) => nav.querySelector<HTMLInputElement>('input.navbar-toggle')!;

  it('renders a collapsed navigation landmark by default', () => {
    const { el } = mountEl(BsNavbar, 'nav');
    expect(el.classList).toContain('navbar');
    expect(el.getAttribute('aria-label')).toBe('Main navigation');
    expect(toggle(el).checked).toBe(false);
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the collapse when expanded is set', async () => {
    const { el } = mountEl(BsNavbar, 'nav', { props: { expanded: true } });
    await nextTick();
    expect(toggle(el).checked).toBe(true);
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('does not announce a programmatic open as a user toggle', () => {
    const { wrapper } = mountEl(BsNavbar, 'nav', { props: { expanded: true } });
    expect(wrapper.emitted('expandedchange')).toBeUndefined();
  });

  it('maps breakpoint, color and positioning onto Bootstrap classes', () => {
    const { el } = mountEl(BsNavbar, 'nav', {
      props: { breakpoint: 'lg', color: 'body-tertiary', positioning: 'fixed' },
    });
    expect([...el.classList]).toEqual(expect.arrayContaining(['navbar-expand-lg', 'bg-body-tertiary', 'fixed-top']));
    expect(el.getAttribute('data-breakpoint')).toBe('lg');
  });

  it('emits expandedchange when the checkbox is toggled', async () => {
    const { wrapper, el } = mountEl(BsNavbar, 'nav');

    toggle(el).click();
    await nextTick();

    expect(wrapper.emitted('expandedchange')![0]).toEqual([{ expanded: true }]);
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('stops emitting once unmounted', () => {
    const { wrapper, el } = mountEl(BsNavbar, 'nav');
    const input = toggle(el);
    wrapper.unmount();

    input.click();

    expect(wrapper.emitted('expandedchange')).toBeUndefined();
  });

  it('renders the brand slot in .navbar-brand', () => {
    const { el } = mountEl(BsNavbar, 'nav', { slots: { brand: () => h('a', { href: '/' }, 'Brand') } });
    expect(el.querySelector('.navbar-brand > a')?.getAttribute('href')).toBe('/');
  });
});

describe('BsNavbarItem — markup from the headless core', () => {
  it('is a plain nav-item around its link by default', () => {
    const { el } = mountEl(BsNavbarItem, 'div', { slots: { default: () => h('a', { href: '/home' }, 'Home') } });
    expect(el.className).toBe('nav-item');
    expect(el.hasAttribute('aria-current')).toBe(false);
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/home');
  });

  it('marks the current page and a disabled entry', () => {
    const { el } = mountEl(BsNavbarItem, 'div', { props: { active: true, disabled: true } });
    expect([...el.classList]).toEqual(['nav-item', 'active', 'disabled']);
    expect(el.getAttribute('aria-current')).toBe('page');
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('becomes a dropdown item inside a BsNavbarDropdown', () => {
    const wrapper = mountWrapper(BsNavbarDropdown, {
      props: { label: 'More' },
      slots: { default: () => h(BsNavbarItem, { active: true }, () => h('a', { href: '/x' }, 'X')) },
    });
    const details = wrapper.element as HTMLDetailsElement;
    expect(details.querySelector('summary')?.textContent).toBe('More');
    const item = details.querySelector('.dropdown-menu > div')!;
    expect([...item.classList]).toEqual(['dropdown-item', 'active']);
    expect(item.getAttribute('aria-current')).toBe('true');
    expect(details.getAttribute('name')).toBe('mp-navbar-0');
  });
});
