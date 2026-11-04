import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, shallowRef } from 'vue';

import { BsDropdownItem, BsDropdownMenu } from '../../dropdown/src/generated';
import type { DropdownSelectEventDetail } from '@mintplayer/ui-core/dropdown';

import { mountEl, mountWrapper } from './harness';

/**
 * The dropdown group's menu (#458 M6): `BsDropdownItem`'s opaque `value` must
 * reach the menu's `itemselect` event unchanged (it travels on the item's
 * `dropdownValue` property, never on a native `value`), and the menu writes
 * its height cap.
 */

// shallowRef, not ref: a deep ref would hand the wrapper a reactive PROXY of the
// object, and the identity check below would compare the proxy, not the value.
const value = shallowRef<unknown>(undefined);
const seen: unknown[] = [];

const Host = defineComponent({
  setup: () => () =>
    h(BsDropdownMenu, { onItemselect: (d: DropdownSelectEventDetail) => seen.push(d.value) }, () =>
      // `value` is opaque (`kind: false`), so the generated prop type cannot name it.
      h(BsDropdownItem, { value: value.value }, () => 'A'),
    ),
});

async function select(next: unknown): Promise<unknown> {
  value.value = next;
  const root = mountWrapper(Host).element as Element;
  await nextTick();
  seen.splice(0);
  root.querySelector<HTMLElement>('.dropdown-item')!.click();
  expect(seen, 'the menu emitted no itemselect event').toHaveLength(1);
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

  it('follows a prop change', async () => {
    value.value = 'first';
    const root = mountWrapper(Host).element as Element;
    await nextTick();
    value.value = { id: 2 };
    await nextTick();
    seen.splice(0);
    root.querySelector<HTMLElement>('.dropdown-item')!.click();
    expect(seen).toEqual([{ id: 2 }]);
  });
});

describe('Vue BsDropdownMenu', () => {
  it('renders the scoped .dropdown-menu with no height cap by default', () => {
    const { el } = mountEl(BsDropdownMenu, 'div.dropdown-menu');
    expect(el.getAttribute('data-mps')).toBe('dropdown');
    expect(el.style.getPropertyValue('--mp-dropdown-max-height')).toBe('');
  });

  // Zero is a legitimate cap and must not be dropped the way an unset value is.
  it('writes maxHeight as the height-cap custom property, zero included', () => {
    const capped = mountEl(BsDropdownMenu, 'div.dropdown-menu', { props: { maxHeight: 240 } }).el;
    expect(capped.style.getPropertyValue('--mp-dropdown-max-height')).toBe('240px');
    const zero = mountEl(BsDropdownMenu, 'div.dropdown-menu', { props: { maxHeight: 0 } }).el;
    expect(zero.style.getPropertyValue('--mp-dropdown-max-height')).toBe('0px');
  });
});
