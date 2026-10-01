import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, shallowRef } from 'vue';

import BsDropdownItem from '../../dropdown-menu/src/BsDropdownItem.vue';
import BsDropdownMenu from '../../dropdown-menu/src/BsDropdownMenu.vue';
import type { DropdownSelectEventDetail } from '@mintplayer/web-components/dropdown-menu';

import { mountWrapper } from './harness';

/**
 * `BsDropdownItem`'s opaque `value` must reach the menu's `select` event
 * unchanged. It used to be written to the `<li>`'s `value` property, which
 * `HTMLLIElement` owns as a native long: an object or a string became 0.
 */

// shallowRef, not ref: a deep ref would hand the wrapper a reactive PROXY of the
// object, and the identity check below would compare the proxy, not the value.
const value = shallowRef<unknown>(undefined);

const Host = defineComponent({
  setup: () => () => h(BsDropdownMenu, null, () => h(BsDropdownItem, { value: value.value }, () => 'A')),
});

async function select(next: unknown): Promise<unknown> {
  value.value = next;
  const root = mountWrapper(Host).element as Element;
  await nextTick();
  const menu = (root.matches('mp-dropdown-menu') ? root : root.querySelector('mp-dropdown-menu'))!;
  const seen: unknown[] = [];
  menu.addEventListener('select', (e) => seen.push((e as CustomEvent<DropdownSelectEventDetail>).detail.value));
  menu.querySelector<HTMLElement>('li.dropdown-item')!.click();
  expect(seen, 'the menu emitted no select event').toHaveLength(1);
  return seen[0];
}

describe('Vue BsDropdownItem value', () => {
  it('carries an object value to the menu select event unchanged', async () => {
    const obj = { id: 7 };
    expect(await select(obj)).toBe(obj);
  });

  it('carries a string value to the menu select event unchanged', async () => {
    expect(await select('two')).toBe('two');
  });

  it('carries an integer value to the menu select event', async () => {
    expect(await select(7)).toBe(7);
  });

  it('follows a prop change', async () => {
    value.value = 'first';
    const root = mountWrapper(Host).element as Element;
    await nextTick();
    value.value = { id: 2 };
    await nextTick();
    const li = root.querySelector('li.dropdown-item')!;
    const menu = li.closest('mp-dropdown-menu')!;
    const seen: unknown[] = [];
    menu.addEventListener('select', (e) => seen.push((e as CustomEvent<DropdownSelectEventDetail>).detail.value));
    (li as HTMLElement).click();
    expect(seen).toEqual([{ id: 2 }]);
  });

  it('leaves the li native value untouched, so no value="0" attribute appears', async () => {
    value.value = 'two';
    const root = mountWrapper(Host).element as Element;
    await nextTick();
    expect(root.querySelector('li.dropdown-item')!.hasAttribute('value')).toBe(false);
  });
});
