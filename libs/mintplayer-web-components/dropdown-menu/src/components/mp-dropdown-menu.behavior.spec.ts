import { afterEach, describe, expect, it } from 'vitest';
import { MpDropdownMenu } from './mp-dropdown-menu';
import type { DropdownSelectEventDetail } from '../types';

async function mount(markup: string, attrs = ''): Promise<MpDropdownMenu> {
  document.body.innerHTML = `<mp-dropdown-menu ${attrs}>${markup}</mp-dropdown-menu>`;
  const menu = document.querySelector('mp-dropdown-menu') as MpDropdownMenu;
  await menu.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  return menu;
}

function key(target: Element, k: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(ev);
  return ev;
}

const items = (menu: MpDropdownMenu): HTMLElement[] =>
  Array.from(menu.querySelectorAll<HTMLElement>(':scope > .dropdown-item'));
const tabbable = (menu: MpDropdownMenu): string[] =>
  items(menu)
    .filter((it) => it.getAttribute('tabindex') === '0')
    .map((it) => it.textContent!.trim());

function collect(menu: MpDropdownMenu): DropdownSelectEventDetail[] {
  const seen: DropdownSelectEventDetail[] = [];
  menu.addEventListener('select', (e) => seen.push((e as CustomEvent<DropdownSelectEventDetail>).detail));
  return seen;
}

const FOUR = `
  <li class="dropdown-header">Header</li>
  <li class="dropdown-item disabled">A</li>
  <li class="dropdown-item">B</li>
  <li class="dropdown-divider"></li>
  <li class="dropdown-item" aria-disabled="true">C</li>
  <li class="dropdown-item">D</li>
  <li class="dropdown-item disabled">E</li>`;

describe('mp-dropdown-menu roving focus (menu mode)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('gives headers and dividers chrome roles and every item a menuitem role', async () => {
    const menu = await mount(FOUR);
    expect(menu.querySelector('.dropdown-header')!.getAttribute('role')).toBe('presentation');
    expect(menu.querySelector('.dropdown-divider')!.getAttribute('role')).toBe('separator');
    expect(items(menu).map((i) => i.getAttribute('role'))).toEqual(Array(5).fill('menuitem'));
  });

  it('keeps a consumer-authored role on a header', async () => {
    const menu = await mount('<li class="dropdown-header" role="heading">H</li><li class="dropdown-item">A</li>');
    expect(menu.querySelector('.dropdown-header')!.getAttribute('role')).toBe('heading');
  });

  it('puts the single roving tab stop on the first enabled item and marks disabled ones', async () => {
    const menu = await mount(FOUR);
    expect(tabbable(menu)).toEqual(['B']);
    expect(items(menu).map((i) => i.getAttribute('aria-disabled'))).toEqual(['true', null, 'true', null, 'true']);
  });

  it('ArrowDown moves to the next enabled item and wraps, skipping disabled ones', async () => {
    const menu = await mount(FOUR);
    const ev = key(menu, 'ArrowDown');
    expect(ev.defaultPrevented).toBe(true);
    expect(tabbable(menu)).toEqual(['D']);
    expect(document.activeElement!.textContent).toBe('D');
    key(menu, 'ArrowDown');
    expect(tabbable(menu)).toEqual(['B']);
  });

  it('ArrowUp moves backwards and wraps', async () => {
    const menu = await mount(FOUR);
    key(menu, 'ArrowUp');
    expect(tabbable(menu)).toEqual(['D']);
    key(menu, 'ArrowUp');
    expect(tabbable(menu)).toEqual(['B']);
  });

  it('Home and End jump to the first and last enabled item', async () => {
    const menu = await mount(FOUR);
    expect(key(menu, 'End').defaultPrevented).toBe(true);
    expect(tabbable(menu)).toEqual(['D']);
    expect(key(menu, 'Home').defaultPrevented).toBe(true);
    expect(tabbable(menu)).toEqual(['B']);
  });

  it('moves the tab stop onto the inner link/button, leaving the li presentational', async () => {
    const menu = await mount(
      '<li class="dropdown-item"><a href="#a">A</a></li><li class="dropdown-item"><button type="button">B</button></li>',
    );
    const [a, b] = items(menu);
    expect(a.getAttribute('role')).toBe('presentation');
    expect(a.querySelector('a')!.getAttribute('role')).toBe('menuitem');
    expect(a.querySelector('a')!.getAttribute('tabindex')).toBe('0');
    key(menu, 'ArrowDown');
    expect(document.activeElement).toBe(b.querySelector('button'));
  });

  it('with every item disabled, arrows and Home/End change nothing', async () => {
    const menu = await mount('<li class="dropdown-item disabled">A</li><li class="dropdown-item disabled">B</li>');
    key(menu, 'ArrowDown');
    key(menu, 'Home');
    key(menu, 'End');
    expect(tabbable(menu)).toEqual([]);
    expect(document.activeElement).toBe(document.body);
  });

  it('an empty menu tolerates navigation keys', async () => {
    const menu = await mount('<li class="dropdown-header">Only a header</li>');
    expect(key(menu, 'ArrowDown').defaultPrevented).toBe(true);
    expect(key(menu, 'End').defaultPrevented).toBe(true);
  });

  it('re-syncs roles and the tab stop when items are added', async () => {
    const menu = await mount('<li class="dropdown-item disabled">A</li>');
    const b = document.createElement('li');
    b.className = 'dropdown-item';
    b.textContent = 'B';
    menu.appendChild(b);
    menu.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'));
    expect(b.getAttribute('role')).toBe('menuitem');
    expect(tabbable(menu)).toEqual(['B']);
  });

  it('Enter on a non-item element or an item of a nested menu does nothing', async () => {
    const menu = await mount(
      '<li class="dropdown-item">A</li><mp-dropdown-menu><li class="dropdown-item" data-value="inner">I</li></mp-dropdown-menu>',
    );
    const fromOuter: unknown[] = [];
    menu.addEventListener('select', (e) => {
      if (e.target === menu) fromOuter.push(e);
    });
    expect(key(menu, 'Enter').defaultPrevented).toBe(false);
    const inner = menu.querySelector(':scope > mp-dropdown-menu .dropdown-item')!;
    // The inner menu owns (and activates) its own item; the outer must not.
    key(inner, 'Enter');
    expect(fromOuter).toEqual([]);
  });

  it('Enter from an SVG icon inside an item does not synthesize activation', async () => {
    const menu = await mount('<li class="dropdown-item"><svg><circle></circle></svg>A</li>');
    const seen = collect(menu);
    const ev = key(menu.querySelector('circle')!, 'Enter');
    expect(ev.defaultPrevented).toBe(false);
    expect(seen).toEqual([]);
  });

  it('stops handling keys and clicks once disconnected', async () => {
    const menu = await mount('<li class="dropdown-item">A</li><li class="dropdown-item">B</li>');
    const seen = collect(menu);
    menu.remove();
    expect(key(menu, 'ArrowDown').defaultPrevented).toBe(false);
    items(menu)[0].click();
    expect(seen).toEqual([]);
  });
});

describe('mp-dropdown-menu activation and values', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clicking an enabled item emits select with its data-value', async () => {
    const menu = await mount('<li class="dropdown-item" data-value="x"><span>X</span></li>');
    const seen = collect(menu);
    menu.querySelector('span')!.click();
    expect(seen).toHaveLength(1);
    expect(seen[0].value).toBe('x');
    expect(seen[0].item).toBe(items(menu)[0]);
  });

  it('clicking a disabled item, chrome, or a nested menu item emits nothing from the outer menu', async () => {
    const menu = await mount(
      '<li class="dropdown-item disabled">A</li><li class="dropdown-divider"></li>' +
        '<mp-dropdown-menu><li class="dropdown-item">I</li></mp-dropdown-menu>',
    );
    const outer: unknown[] = [];
    menu.addEventListener('select', (e) => {
      if (e.target === menu) outer.push(e);
    });
    items(menu)[0].click();
    (menu.querySelector('.dropdown-divider') as HTMLElement).click();
    (menu.querySelector(':scope > mp-dropdown-menu .dropdown-item') as HTMLElement).click();
    expect(outer).toEqual([]);
  });

  it('prefers a JS value property on a non-li item over data-value', async () => {
    const menu = await mount('<div class="dropdown-item" data-value="attr">A</div><div class="dropdown-item" data-value="d">B</div>');
    const seen = collect(menu);
    const [a, b] = items(menu);
    (a as HTMLElement & { value: unknown }).value = { id: 1 };
    a.click();
    b.click();
    expect(seen.map((s) => s.value)).toEqual([{ id: 1 }, 'd']);
  });

  it('a bare li without data-value yields undefined rather than its native ordinal 0', async () => {
    const menu = await mount('<li class="dropdown-item">A</li>');
    const seen = collect(menu);
    items(menu)[0].click();
    expect(seen[0].value).toBeUndefined();
  });

  it('an li with an authored value attribute reports its numeric value', async () => {
    const menu = await mount('<li class="dropdown-item" value="7">A</li>');
    const seen = collect(menu);
    items(menu)[0].click();
    expect(seen[0].value).toBe(7);
  });
});

describe('mp-dropdown-menu listbox mode and attributes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('listbox mode assigns option roles with aria-selected and no tab stops', async () => {
    const menu = await mount(
      '<li class="dropdown-item active">A</li><li class="dropdown-item">B</li>',
      'mode="listbox"',
    );
    expect(menu.shadowRoot!.querySelector('ul')!.getAttribute('role')).toBe('listbox');
    expect(items(menu).map((i) => [i.getAttribute('role'), i.getAttribute('aria-selected'), i.getAttribute('tabindex')])).toEqual([
      ['option', 'true', '-1'],
      ['option', 'false', '-1'],
    ]);
  });

  it('the mode property reflects, and switching back to menu drops aria-selected', async () => {
    const menu = await mount('<li class="dropdown-item">A</li>');
    expect(menu.mode).toBe('menu');
    menu.mode = 'listbox';
    expect(menu.getAttribute('mode')).toBe('listbox');
    expect(items(menu)[0].getAttribute('aria-selected')).toBe('false');
    menu.mode = '' as never;
    expect(menu.hasAttribute('mode')).toBe(false);
    expect(menu.mode).toBe('menu');
    expect(items(menu)[0].hasAttribute('aria-selected')).toBe(false);
    await menu.updateComplete;
    expect(menu.shadowRoot!.querySelector('ul')!.getAttribute('role')).toBe('menu');
  });

  it('max-height maps to the custom property and is cleared on removal', async () => {
    const menu = await mount('', 'max-height="200"');
    expect(menu.style.getPropertyValue('--mp-dropdown-max-height')).toBe('200px');
    menu.removeAttribute('max-height');
    expect(menu.style.getPropertyValue('--mp-dropdown-max-height')).toBe('');
  });

  it('the inputLabel property names the list and ignores a no-op write', async () => {
    const menu = await mount('');
    menu.inputLabel = 'Actions';
    expect(menu.inputLabel).toBe('Actions');
    await menu.updateComplete;
    const ul = menu.shadowRoot!.querySelector('ul')!;
    expect(ul.getAttribute('aria-label')).toBe('Actions');
    menu.inputLabel = 'Actions';
    expect(menu.isUpdatePending).toBe(false);
    menu.inputLabel = null;
    await menu.updateComplete;
    expect(ul.hasAttribute('aria-label')).toBe(false);
  });

  it('a host aria-label added later re-renders onto the list', async () => {
    const menu = await mount('');
    menu.setAttribute('aria-label', 'Later');
    await menu.updateComplete;
    expect(menu.shadowRoot!.querySelector('ul')!.getAttribute('aria-label')).toBe('Later');
  });
});

describe('MpDropdownElement DSD handoff', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function upgradeWithStaleShadow(tag: string, ctor: CustomElementConstructor): HTMLElement {
    const el = document.createElement(tag);
    const root = el.attachShadow({ mode: 'open' });
    const stale = document.createElement('p');
    stale.className = 'ssr-chrome';
    root.appendChild(stale);
    document.body.appendChild(el);
    customElements.define(tag, ctor);
    return el;
  }

  it('clears inert SSR chrome before the first render when hydrate support is absent', async () => {
    class Plain extends MpDropdownMenu {}
    const el = upgradeWithStaleShadow('mp-dropdown-dsd-plain', Plain) as MpDropdownMenu;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.ssr-chrome')).toBeNull();
    expect(el.shadowRoot!.querySelectorAll('ul')).toHaveLength(1);
  });

  it('leaves the DSD to lit when hydrate support observes defer-hydration', async () => {
    class Hydrating extends MpDropdownMenu {
      static override get observedAttributes(): string[] {
        return [...super.observedAttributes, 'defer-hydration'];
      }
    }
    const el = upgradeWithStaleShadow('mp-dropdown-dsd-hydrating', Hydrating) as MpDropdownMenu;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.ssr-chrome')).not.toBeNull();
  });
});
