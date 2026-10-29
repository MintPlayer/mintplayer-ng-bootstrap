import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachDropdownMenu,
  connectDropdownMenu,
  dropdownItemValue,
  syncDropdownMenu,
  type DropdownItemElement,
} from './dropdown-menu';

function mount(inner: string): HTMLElement {
  const menu = document.createElement('ul');
  menu.className = 'dropdown-menu show';
  menu.innerHTML = inner;
  document.body.append(menu);
  return menu;
}

const controls = (menu: HTMLElement) => [...menu.querySelectorAll<HTMLElement>('[role=menuitem]')];
const press = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const flush = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => document.body.replaceChildren());

describe('connectDropdownMenu', () => {
  it('writes role=menu only once hydrated, so the no-JS list stays valid', () => {
    // No data-mps: whoever renders the menu stamps its own scope (S15).
    expect(connectDropdownMenu({ hydrated: false })).toEqual({
      class: 'dropdown-menu show',
      role: null,
      'aria-label': null,
      'aria-labelledby': null,
    });
    expect(connectDropdownMenu({ hydrated: true, labelledBy: 't' })['aria-labelledby']).toBe('t');
    expect(connectDropdownMenu({ hydrated: true, label: 'Actions' })).toMatchObject({ role: 'menu', 'aria-label': 'Actions' });
  });
});

describe('syncDropdownMenu', () => {
  it('puts menuitem on the control and presentation on a wrapping item', () => {
    const menu = mount(
      '<li class="dropdown-header">H</li><li class="dropdown-item"><a href="#a">A</a></li>'
        + '<li class="dropdown-divider"></li><li class="dropdown-item">B</li>',
    );
    syncDropdownMenu(menu);
    expect(menu.querySelector('.dropdown-header')?.getAttribute('role')).toBe('presentation');
    expect(menu.querySelector('.dropdown-divider')?.getAttribute('role')).toBe('separator');
    expect(menu.querySelector('li.dropdown-item')?.getAttribute('role')).toBe('presentation');
    expect(controls(menu).map((c) => c.textContent)).toEqual(['A', 'B']);
  });

  it('keeps one tab stop, on an enabled item, and marks disabled items', () => {
    const menu = mount('<li class="dropdown-item disabled">A</li><li class="dropdown-item">B</li><li class="dropdown-item">C</li>');
    expect(syncDropdownMenu(menu)).toBe(1);
    expect(controls(menu).map((c) => c.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(controls(menu)[0].getAttribute('aria-disabled')).toBe('true');
  });

  it('leaves the items of a nested menu to that menu', () => {
    const menu = mount('<li class="dropdown-item">A</li><li><ul class="dropdown-menu"><li class="dropdown-item">N</li></ul></li>');
    syncDropdownMenu(menu);
    expect(controls(menu).map((c) => c.textContent)).toEqual(['A']);
  });
});

describe('dropdownItemValue', () => {
  it('prefers the opaque property, then data-value, and ignores the native li ordinal', () => {
    const menu = mount('<li class="dropdown-item" data-value="x">A</li><li class="dropdown-item">B</li><li class="dropdown-item" value="3">C</li>');
    const [a, b, c] = [...menu.children] as DropdownItemElement[];
    expect(dropdownItemValue(a)).toBe('x');
    expect(dropdownItemValue(b)).toBeUndefined();
    expect(dropdownItemValue(c)).toBe(3);
    const value = { id: 1 };
    a.dropdownValue = value;
    expect(dropdownItemValue(a)).toBe(value);
  });
});

describe('attachDropdownMenu', () => {
  it('roves with wrapping arrows and Home/End, skipping disabled items', () => {
    const menu = mount('<li class="dropdown-item">A</li><li class="dropdown-item disabled">B</li><li class="dropdown-item">C</li>');
    const dispose = attachDropdownMenu(menu);
    const [a, , c] = controls(menu);
    a.focus();
    press(a, 'ArrowDown');
    expect(document.activeElement).toBe(c);
    press(c, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    press(a, 'End');
    expect(document.activeElement).toBe(c);
    expect(c.getAttribute('tabindex')).toBe('0');
    expect(a.getAttribute('tabindex')).toBe('-1');
    dispose();
  });

  it('activates a bare item on Enter and Space, but never double-fires a button or link', () => {
    const onSelect = vi.fn();
    const menu = mount('<li class="dropdown-item" data-value="bare">A</li><li class="dropdown-item"><button>B</button></li>');
    attachDropdownMenu(menu, { onSelect });
    const [bare, button] = controls(menu);
    press(bare, 'Enter');
    press(bare, ' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ item: bare, value: 'bare' });
    const clicked = vi.fn();
    button.addEventListener('click', clicked);
    press(button, 'Enter');
    expect(clicked).not.toHaveBeenCalled();
  });

  it('reports no selection for a disabled item', () => {
    const onSelect = vi.fn();
    const menu = mount('<li class="dropdown-item disabled">A</li>');
    attachDropdownMenu(menu, { onSelect });
    controls(menu)[0].click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('in navigation mode keeps native roles and tab order, and only adds arrow shortcuts', () => {
    const menu = mount('<li class="dropdown-item"><a href="#a">A</a></li><li class="dropdown-divider"></li><li class="dropdown-item"><a href="#b">B</a></li>');
    attachDropdownMenu(menu, { mode: 'navigation' });
    const [a, b] = [...menu.querySelectorAll<HTMLElement>('a')];
    expect(controls(menu)).toEqual([]);
    expect(a.hasAttribute('tabindex')).toBe(false);
    expect(menu.querySelector('.dropdown-divider')?.getAttribute('role')).toBe('separator');
    a.focus();
    press(a, 'ArrowDown');
    expect(document.activeElement).toBe(b);
    expect(b.hasAttribute('tabindex')).toBe(false);
  });

  it('covers items added after attaching', async () => {
    const menu = mount('<li class="dropdown-item">A</li>');
    attachDropdownMenu(menu);
    menu.insertAdjacentHTML('beforeend', '<li class="dropdown-item"><a href="#b">B</a></li>');
    await flush();
    expect(controls(menu).map((c) => c.textContent)).toEqual(['A', 'B']);
  });
});
