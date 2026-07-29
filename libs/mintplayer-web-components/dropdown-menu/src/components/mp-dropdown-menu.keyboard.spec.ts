import { beforeEach, describe, expect, it } from 'vitest';
import './mp-dropdown-menu';
import type { MpDropdownMenu } from './mp-dropdown-menu';
import type { DropdownSelectEventDetail } from '../types';

/**
 * Keyboard activation for `<mp-dropdown-menu mode="menu">`.
 *
 * The specific defect this guards: a bare `<li class="dropdown-item">` is itself
 * the focusable menuitem, and a plain element has no native activation — so
 * Enter/Space did nothing while click worked (pointer-only, the audit's largest
 * Critical class). The fix synthesizes the click ONLY where the UA would not
 * activate natively; on real buttons/links it stays out of the way, because
 * synthesizing there double-fires.
 */
async function mount(itemsHtml: string): Promise<MpDropdownMenu> {
  document.body.innerHTML = `<mp-dropdown-menu mode="menu">${itemsHtml}</mp-dropdown-menu>`;
  const menu = document.querySelector('mp-dropdown-menu') as MpDropdownMenu;
  await menu.updateComplete;
  // #syncItems runs from firstUpdated/slotchange; give the microtask queue a turn.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return menu;
}

function key(target: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(ev);
  return ev;
}

describe('mp-dropdown-menu keyboard activation', () => {
  let selections: DropdownSelectEventDetail[];

  beforeEach(() => {
    document.body.innerHTML = '';
    selections = [];
  });

  const collect = (menu: MpDropdownMenu) =>
    menu.addEventListener('select', (e) => selections.push((e as CustomEvent<DropdownSelectEventDetail>).detail));

  it('Enter activates a BARE li menuitem (no native control inside)', async () => {
    const menu = await mount('<li class="dropdown-item" data-value="a">Plain item</li>');
    collect(menu);
    const item = menu.querySelector<HTMLElement>('.dropdown-item')!;

    const ev = key(item, 'Enter');

    expect(selections).toHaveLength(1);
    expect(selections[0].value).toBe('a');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('Space activates a bare li menuitem and is preventDefault-ed (no page scroll)', async () => {
    const menu = await mount('<li class="dropdown-item" data-value="a">Plain item</li>');
    collect(menu);
    const item = menu.querySelector<HTMLElement>('.dropdown-item')!;

    const ev = key(item, ' ');

    expect(selections).toHaveLength(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('does NOT synthesize for a <button> inside the item — the UA activates it natively', async () => {
    // In this untrusted-event unit test the native activation does not run
    // either, so a selection count of 0 is precisely the proof that no
    // synthetic double-fire path exists. The real keypress is e2e material.
    const menu = await mount('<li class="dropdown-item"><button type="button">Real button</button></li>');
    collect(menu);
    const button = menu.querySelector<HTMLElement>('button')!;

    const ev = key(button, 'Enter');

    expect(selections).toHaveLength(0);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('does NOT synthesize Enter for an <a href> — native — but DOES synthesize Space', async () => {
    const menu = await mount('<li class="dropdown-item"><a href="#x">Link item</a></li>');
    collect(menu);
    const link = menu.querySelector<HTMLElement>('a')!;

    expect(key(link, 'Enter').defaultPrevented).toBe(false);
    expect(selections).toHaveLength(0);

    // Space does NOT activate links natively — it scrolls. Here it must select.
    const ev = key(link, ' ');
    expect(selections).toHaveLength(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('ignores disabled items', async () => {
    const menu = await mount('<li class="dropdown-item disabled" data-value="a">Disabled</li>');
    collect(menu);
    const item = menu.querySelector<HTMLElement>('.dropdown-item')!;

    key(item, 'Enter');
    expect(selections).toHaveLength(0);
  });

  it('stays inert in listbox mode, whose keyboard model belongs to the consumer', async () => {
    document.body.innerHTML =
      '<mp-dropdown-menu mode="listbox"><li class="dropdown-item" data-value="a">Item</li></mp-dropdown-menu>';
    const menu = document.querySelector('mp-dropdown-menu') as MpDropdownMenu;
    await menu.updateComplete;
    collect(menu);

    key(menu.querySelector<HTMLElement>('.dropdown-item')!, 'Enter');
    expect(selections).toHaveLength(0);
  });
});
