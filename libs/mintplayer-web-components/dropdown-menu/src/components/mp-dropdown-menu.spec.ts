import { afterEach, describe, expect, it } from 'vitest';
import { MpDropdownMenu } from './mp-dropdown-menu';

void MpDropdownMenu; // force the side-effect registration

/**
 * The Lit dropdown-menu front (#437): the element is the `.dropdown-menu`
 * itself, in the light DOM. The keyboard and role behaviour belong to the
 * core's `attachDropdownMenu` and are pinned in its own spec; this file pins
 * that the front attaches it, keeps the consumer's naming, maps `max-height`,
 * and re-dispatches selection as a `select` event.
 */

async function mount(markup: string): Promise<MpDropdownMenu> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const menu = host.querySelector('mp-dropdown-menu') as MpDropdownMenu;
  await menu.updateComplete;
  return menu;
}

const ITEMS = '<li class="dropdown-item" data-value="a"><a href="#a">A</a></li><li class="dropdown-divider"></li><li class="dropdown-item disabled"><a href="#b">B</a></li><li class="dropdown-item" data-value="c"><button type="button">C</button></li>';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-dropdown-menu', () => {
  it('is the menu itself, keeping the consumer name and class', async () => {
    const menu = await mount(`<mp-dropdown-menu class="mine" aria-label="Actions">${ITEMS}</mp-dropdown-menu>`);
    expect(menu.shadowRoot).toBeNull();
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-label')).toBe('Actions');
    expect([...menu.classList]).toEqual(expect.arrayContaining(['mine', 'dropdown-menu', 'show']));
    expect(menu.getAttribute('data-mps')).toBe('dropdown-menu');
  });

  it('gives every enabled item a menuitem and one roving tab stop', async () => {
    const menu = await mount(`<mp-dropdown-menu>${ITEMS}</mp-dropdown-menu>`);
    const controls = [...menu.querySelectorAll('[role="menuitem"]')];
    expect(controls.length).toBe(3);
    expect(controls.filter((c) => c.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('maps max-height to the custom property, and clears it', async () => {
    const menu = await mount(`<mp-dropdown-menu max-height="120">${ITEMS}</mp-dropdown-menu>`);
    expect(menu.style.getPropertyValue('--mp-dropdown-max-height')).toBe('120px');
    menu.removeAttribute('max-height');
    await menu.updateComplete;
    expect(menu.style.getPropertyValue('--mp-dropdown-max-height')).toBe('');
  });

  it('dispatches select with the item value, and not for a disabled item', async () => {
    const menu = await mount(`<mp-dropdown-menu>${ITEMS}</mp-dropdown-menu>`);
    const values: unknown[] = [];
    menu.addEventListener('select', (e) => values.push((e as CustomEvent<{ value: unknown }>).detail.value));
    (menu.querySelector('[data-value="c"] button') as HTMLButtonElement).click();
    (menu.querySelector('.disabled a') as HTMLAnchorElement).click();
    expect(values).toEqual(['c']);
  });

  it('detaches when removed', async () => {
    const menu = await mount(`<mp-dropdown-menu>${ITEMS}</mp-dropdown-menu>`);
    const values: unknown[] = [];
    menu.addEventListener('select', (e) => values.push((e as CustomEvent<{ value: unknown }>).detail.value));
    const parent = menu.parentElement as HTMLElement;
    menu.remove();
    (menu.querySelector('[data-value="c"] button') as HTMLButtonElement).click();
    expect(values).toEqual([]);
    parent.append(menu);
  });
});
