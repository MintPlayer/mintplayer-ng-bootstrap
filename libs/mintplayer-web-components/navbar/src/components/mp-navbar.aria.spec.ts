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

  /*
   * The `expanded` PROPERTY, which is a separate road from the attribute above
   * and the one the React and Vue wrappers actually travel. Both lower a
   * `true` to the attribute *shape* `''` — the DSD chrome and the no-JS CSS
   * select on attributes — but both frameworks prefer a property over an
   * attribute for any name they find on the element's prototype, and `''` is
   * falsy in JavaScript. The navbar closed itself when asked to open, in two
   * frameworks of three; Angular escaped it only because it binds
   * `[attr.expanded]`.
   */
  it('treats the empty string as ON, the way a boolean attribute does', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);
    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.navbar-toggle')!;

    (el as unknown as { expanded: boolean | '' }).expanded = '';

    expect(toggle.checked).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.expanded).toBe(true);
  });

  it('closes on a falsy property write', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);
    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.navbar-toggle')!;
    el.expanded = true;

    el.expanded = false;

    expect(toggle.checked).toBe(false);
    expect(el.expanded).toBe(false);
  });

  // A programmatic write is the consumer's own act, not a state change to
  // announce back to them — and it used to fire, so a controlled binding got an
  // echo of every value it had just set.
  it('does not emit expandedchange for a programmatic write', async () => {
    const el = makeNavbar();
    document.body.appendChild(el);
    await flush(el);
    const seen: Event[] = [];
    el.addEventListener('expandedchange', (e) => seen.push(e));

    el.expanded = true;
    el.setAttribute('expanded', '');

    expect(seen).toHaveLength(0);
  });

  // The checkbox IS the state, and it does not exist until the first render, so
  // a value that arrives before then has to be held. `<mp-navbar expanded>` in
  // server-rendered HTML lands exactly here.
  it('applies an expanded set before the first render', async () => {
    const el = makeNavbar();
    el.expanded = true;
    document.body.appendChild(el);
    await flush(el);

    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.navbar-toggle')!;
    expect(toggle.checked).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('applies an expanded ATTRIBUTE present before the first render', async () => {
    const el = makeNavbar();
    el.setAttribute('expanded', '');
    document.body.appendChild(el);
    await flush(el);

    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>('.navbar-toggle')!;
    expect(toggle.checked).toBe(true);
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

    // Derived in render() since Phase E (one writer, PRD 11a) — the value is
    // correct at every RENDERED moment, so each step awaits the render tick.
    dd.setAttribute('data-open', ''); // inline path
    await flush(dd);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    dd.removeAttribute('data-open');
    await flush(dd);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    dd.setAttribute('data-menu-open', ''); // OverlayController path
    await flush(dd);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    dd.removeAttribute('data-menu-open');
    await flush(dd);
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

describe('mp-navbar-dropdown — aria-expanded is derived, never stamped (PRD 11a)', () => {
  it('an initially-open dropdown announces expanded from the FIRST paint', async () => {
    // The pre-fix defect: data-open present before first render → the
    // imperative patch hit an undefined renderRoot → render stamped a
    // literal "false" forever.
    const nav = document.createElement('mp-navbar');
    const dd = document.createElement('mp-navbar-dropdown');
    dd.setAttribute('data-open', '');
    const label = document.createElement('span');
    label.setAttribute('slot', 'label');
    label.textContent = 'Menu';
    dd.appendChild(label);
    nav.appendChild(dd);
    document.body.appendChild(nav);
    await customElements.whenDefined('mp-navbar-dropdown');
    await (dd as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;

    const toggle = dd.shadowRoot!.querySelector('.dropdown-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    dd.removeAttribute('data-open');
    await (dd as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    nav.remove();
  });
});
