import { describe, it, expect, afterEach } from 'vitest';
import { MpNavbar } from './mp-navbar';
import { MpNavbarDropdown } from './mp-navbar-dropdown';
import '@mintplayer/web-components/dropdown-menu';

void MpNavbar;
void MpNavbarDropdown;

async function flush(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

function makeNavbar(): MpNavbar {
  const el = document.createElement('mp-navbar') as MpNavbar;
  const brand = document.createElement('a');
  brand.setAttribute('slot', 'brand');
  brand.href = '/';
  brand.textContent = 'Brand';
  el.appendChild(brand);
  return el;
}

/** mp-navbar-dropdown with a slotted label + menu of two link items. */
function makeDropdown(): MpNavbarDropdown {
  const dd = document.createElement('mp-navbar-dropdown') as MpNavbarDropdown;
  const label = document.createElement('span');
  label.setAttribute('slot', 'label');
  label.textContent = 'Products';
  const menu = document.createElement('mp-dropdown-menu');
  for (const name of ['One', 'Two']) {
    const li = document.createElement('li');
    li.className = 'dropdown-item';
    const a = document.createElement('a');
    a.href = `/${name.toLowerCase()}`;
    a.textContent = name;
    li.appendChild(a);
    menu.appendChild(li);
  }
  dd.append(label, menu);
  return dd;
}

describe('mp-navbar toggler ARIA (disclosure button over the checkbox machine)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('presents the toggle as a labelled button with aria-expanded', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);

    const toggle = el.shadowRoot!.querySelector('.navbar-toggle')!;
    expect(toggle.getAttribute('role')).toBe('button');
    expect(toggle.getAttribute('aria-label')).toBe('Toggle navigation');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('aria-controls points at the real collapse id in the same shadow tree', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);

    const toggle = el.shadowRoot!.querySelector('.navbar-toggle')!;
    const targetId = toggle.getAttribute('aria-controls')!;
    expect(targetId).toBeTruthy();
    const region = el.shadowRoot!.getElementById(targetId);
    expect(region).not.toBeNull();
    expect(region!.classList.contains('navbar-collapse')).toBe(true);
  });

  it('keeps aria-expanded in sync on PROGRAMMATIC toggles (the stale-aria regression)', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);
    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.navbar-toggle')!;

    el.toggle(true); // e.g. [expanded] binding
    expect(toggle.checked).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    el.toggle(false); // e.g. dismiss-on-navigate
    expect(toggle.checked).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('syncs aria-expanded when the expanded ATTRIBUTE is written', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);
    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.navbar-toggle')!;

    el.setAttribute('expanded', '');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    el.removeAttribute('expanded');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('Enter toggles the collapse (native checkboxes only handle Space)', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);
    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.navbar-toggle')!;

    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    expect(toggle.checked).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('labels the <nav> landmark (default, overridable)', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);
    expect(el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('Main navigation');

    el.setAttribute('aria-label', 'Site menu');
    await flush(el);
    expect(el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('Site menu');
  });
});

describe('mp-navbar-dropdown trigger ARIA + keyboard', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mirrors both open flags onto the trigger aria-expanded', async () => {
    const dd = makeDropdown();
    document.body.appendChild(dd);
    await flush(dd);
    const trigger = dd.shadowRoot!.querySelector('.dropdown-toggle')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    dd.setAttribute('data-open', ''); // inline path
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    dd.removeAttribute('data-open');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    dd.setAttribute('data-menu-open', ''); // OverlayController path
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    dd.removeAttribute('data-menu-open');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowDown opens the menu and focuses its first item control', async () => {
    const dd = makeDropdown();
    document.body.appendChild(dd);
    await flush(dd);

    dd.shadowRoot!
      .querySelector('.dropdown-toggle')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));

    expect(dd.hasAttribute('data-open')).toBe(true);
    const firstControl = dd.querySelector('.dropdown-item a');
    expect(document.activeElement).toBe(firstControl);
  });

  it('Escape from INSIDE the slotted menu closes it and returns focus to the trigger', async () => {
    const dd = makeDropdown();
    document.body.appendChild(dd);
    await flush(dd);

    dd.setAttribute('data-open', '');
    const itemLink = dd.querySelector<HTMLAnchorElement>('.dropdown-item a')!;
    itemLink.focus();
    itemLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));

    expect(dd.hasAttribute('data-open')).toBe(false);
    // Focus inside a shadow tree surfaces as the host being the active element.
    expect(document.activeElement).toBe(dd);
    expect(dd.shadowRoot!.activeElement).toBe(dd.shadowRoot!.querySelector('.dropdown-toggle'));
  });
});
