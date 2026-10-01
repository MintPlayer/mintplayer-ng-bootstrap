import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import {
  BsDropdownDivider,
  BsDropdownHeader,
  BsDropdownItem,
  BsDropdownMenu,
} from '@mintplayer/react-bootstrap/dropdown-menu';
import { render, renderEl } from './harness';

/**
 * The dropdown-menu item helpers have no web component of their own: they render
 * the light-DOM `<li>` that `<mp-dropdown-menu>` slots and styles. What they own
 * is the class contract the menu keys on (`.dropdown-item`, `.active`,
 * `.disabled`), `aria-disabled` for a disabled item, the opaque `value` the menu
 * carries in its `select` event (a JS property, since it may be any value), and
 * ref forwarding to the `<li>`.
 */

const inMenu = (node: React.ReactElement) => <BsDropdownMenu>{node}</BsDropdownMenu>;

/** Click the first item and return the `value` the menu's `select` event carried. */
async function selectedValue(host: HTMLElement): Promise<unknown> {
  const menu = host.querySelector('mp-dropdown-menu')!;
  const seen: unknown[] = [];
  menu.addEventListener('select', (e) => seen.push((e as CustomEvent<{ value: unknown }>).detail.value));
  await act(async () => {
    host.querySelector<HTMLElement>('li.dropdown-item')!.click();
  });
  expect(seen, 'the menu emitted no select event').toHaveLength(1);
  return seen[0];
}

describe('React BsDropdownItem', () => {
  it('renders a plain dropdown-item with no state classes by default', async () => {
    const li = await renderEl(inMenu(<BsDropdownItem>Action</BsDropdownItem>), 'li');

    expect(li.className).toBe('dropdown-item');
    expect(li.hasAttribute('aria-disabled')).toBe(false);
  });

  it('adds .active for an active item', async () => {
    const li = await renderEl(inMenu(<BsDropdownItem active>Action</BsDropdownItem>), 'li');

    expect([...li.classList]).toEqual(['dropdown-item', 'active']);
  });

  it('adds .disabled and aria-disabled for a disabled item', async () => {
    const li = await renderEl(inMenu(<BsDropdownItem disabled>Action</BsDropdownItem>), 'li');

    expect([...li.classList]).toEqual(['dropdown-item', 'disabled']);
    expect(li.getAttribute('aria-disabled')).toBe('true');
  });

  it('merges a consumer className after the state classes', async () => {
    const li = await renderEl(inMenu(<BsDropdownItem active disabled className="mine">A</BsDropdownItem>), 'li');

    expect([...li.classList]).toEqual(['dropdown-item', 'active', 'disabled', 'mine']);
  });

  it('carries a numeric value to the menu select event, and follows a prop change', async () => {
    await render(inMenu(<BsDropdownItem value={3}>A</BsDropdownItem>));
    const host = await render(inMenu(<BsDropdownItem value={7}>A</BsDropdownItem>));

    expect(await selectedValue(host)).toBe(7);
  });

  /*
   * Regression (M19): the wrapper used to assign `value` to the `<li>` as a
   * property, but `HTMLLIElement.value` is a NATIVE long (the `<ol>` ordinal), so
   * an object or a string became 0 and the menu's `select` event reported 0. The
   * value now travels on the non-colliding `dropdownValue` property the menu reads.
   */
  it('carries an object value to the menu select event unchanged', async () => {
    const value = { id: 7 };
    const host = await render(inMenu(<BsDropdownItem value={value}>A</BsDropdownItem>));

    expect(await selectedValue(host)).toBe(value);
  });

  it('carries a string value to the menu select event unchanged', async () => {
    const host = await render(inMenu(<BsDropdownItem value="two">A</BsDropdownItem>));

    expect(await selectedValue(host)).toBe('two');
  });

  it('leaves the li native value untouched, so no value="0" attribute appears', async () => {
    const li = await renderEl(inMenu(<BsDropdownItem value="two">A</BsDropdownItem>), 'li');

    expect(li.hasAttribute('value')).toBe(false);
  });

  it('forwards its ref to the <li>', async () => {
    const ref = React.createRef<HTMLLIElement>();
    const li = await renderEl(inMenu(<BsDropdownItem ref={ref}>A</BsDropdownItem>), 'li');

    expect(ref.current).toBe(li);
  });

  it('renders its children inside the item', async () => {
    const li = await renderEl(inMenu(<BsDropdownItem><a href="/x">Go</a></BsDropdownItem>), 'li');

    expect(li.querySelector('a')!.getAttribute('href')).toBe('/x');
  });
});

describe('React BsDropdownHeader', () => {
  it('renders a dropdown-header labelled by its children, merging className', async () => {
    const li = await renderEl(inMenu(<BsDropdownHeader className="mine">Group</BsDropdownHeader>), 'li');

    expect([...li.classList]).toEqual(['dropdown-header', 'mine']);
    expect(li.textContent).toBe('Group');
  });

  it('renders only its own class without a className, and forwards its ref', async () => {
    const ref = React.createRef<HTMLLIElement>();
    const li = await renderEl(inMenu(<BsDropdownHeader ref={ref}>G</BsDropdownHeader>), 'li');

    expect(li.className).toBe('dropdown-header');
    expect(ref.current).toBe(li);
  });
});

describe('React BsDropdownDivider', () => {
  it('renders a separator-role dropdown-divider', async () => {
    const li = await renderEl(inMenu(<BsDropdownDivider />), 'li');

    expect(li.className).toBe('dropdown-divider');
    expect(li.getAttribute('role')).toBe('separator');
  });

  it('merges className and forwards its ref', async () => {
    const ref = React.createRef<HTMLLIElement>();
    const li = await renderEl(inMenu(<BsDropdownDivider className="mine" ref={ref} />), 'li');

    expect([...li.classList]).toEqual(['dropdown-divider', 'mine']);
    expect(ref.current).toBe(li);
  });
});
