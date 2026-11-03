import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { BsDropdownDivider, BsDropdownHeader, BsDropdownItem, BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown';
import { render, renderEl } from './harness';

/**
 * The dropdown group's menu parts (#458 M6): `BsDropdownMenu` and the item,
 * header and divider inside it. What they own is the class contract the menu
 * keys on (`.dropdown-item`, `.active`, `.disabled`), the menuitem role and
 * `aria-disabled` the menu writes, the opaque `value` it reports through
 * `onItemSelect` (a JS property, since it may be any value), the height cap,
 * and ref forwarding.
 */

const seen: unknown[] = [];
const inMenu = (node: React.ReactElement) => (
  <BsDropdownMenu onItemSelect={({ value }) => seen.push(value)}>{node}</BsDropdownMenu>
);

/** Click the first item and return the `value` the menu reported. */
async function selectedValue(host: HTMLElement): Promise<unknown> {
  seen.splice(0);
  await act(async () => {
    host.querySelector<HTMLElement>('.dropdown-item')!.click();
  });
  expect(seen, 'the menu reported no selection').toHaveLength(1);
  return seen[0];
}

describe('React BsDropdownMenu', () => {
  it('renders the scoped .dropdown-menu, a menu once hydrated, with no height cap by default', async () => {
    const menu = await renderEl(<BsDropdownMenu label="Actions" />, 'div.dropdown-menu');
    expect(menu.getAttribute('data-mps')).toBe('dropdown');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-label')).toBe('Actions');
    expect(menu.style.getPropertyValue('--mp-dropdown-max-height')).toBe('');
  });

  // Zero is a legitimate cap and must not be dropped the way an unset value is.
  it('writes maxHeight as the height-cap custom property, zero included', async () => {
    const capped = await renderEl(<BsDropdownMenu maxHeight={240} />, 'div.dropdown-menu');
    expect(capped.style.getPropertyValue('--mp-dropdown-max-height')).toBe('240px');
    const zero = await renderEl(<BsDropdownMenu maxHeight={0} />, 'div.dropdown-menu');
    expect(zero.style.getPropertyValue('--mp-dropdown-max-height')).toBe('0px');
  });
});

describe('React BsDropdownItem', () => {
  it('renders a plain dropdown-item, the menuitem itself, with no state classes by default', async () => {
    const item = await renderEl(inMenu(<BsDropdownItem>Action</BsDropdownItem>), '.dropdown-item');

    expect(item.className).toBe('dropdown-item');
    expect(item.getAttribute('role')).toBe('menuitem');
    expect(item.hasAttribute('aria-disabled')).toBe(false);
  });

  it('adds .active for an active item', async () => {
    const item = await renderEl(inMenu(<BsDropdownItem active>Action</BsDropdownItem>), '.dropdown-item');

    expect([...item.classList]).toEqual(['dropdown-item', 'active']);
  });

  it('adds .disabled, and the menu marks the menuitem aria-disabled', async () => {
    const item = await renderEl(inMenu(<BsDropdownItem disabled>Action</BsDropdownItem>), '.dropdown-item');

    expect([...item.classList]).toEqual(['dropdown-item', 'disabled']);
    expect(item.getAttribute('aria-disabled')).toBe('true');
  });

  it('makes a wrapped link the menuitem and the item presentational', async () => {
    const item = await renderEl(inMenu(<BsDropdownItem><a href="/x">Go</a></BsDropdownItem>), '.dropdown-item');

    expect(item.getAttribute('role')).toBe('presentation');
    expect(item.querySelector('a')!.getAttribute('role')).toBe('menuitem');
    expect(item.querySelector('a')!.getAttribute('href')).toBe('/x');
  });

  it('merges a consumer className after the state classes', async () => {
    const item = await renderEl(inMenu(<BsDropdownItem active disabled className="mine">A</BsDropdownItem>), '.dropdown-item');

    expect([...item.classList]).toEqual(['dropdown-item', 'active', 'disabled', 'mine']);
  });

  it('carries a numeric value to the menu select event, and follows a prop change', async () => {
    await render(inMenu(<BsDropdownItem value={3}>A</BsDropdownItem>));
    const host = await render(inMenu(<BsDropdownItem value={7}>A</BsDropdownItem>));

    expect(await selectedValue(host)).toBe(7);
  });

  it('carries an object value to the menu select event unchanged', async () => {
    const value = { id: 7 };
    const host = await render(inMenu(<BsDropdownItem value={value}>A</BsDropdownItem>));

    expect(await selectedValue(host)).toBe(value);
  });

  it('forwards its ref to the item', async () => {
    const ref = React.createRef<HTMLDivElement>();
    const item = await renderEl(inMenu(<BsDropdownItem ref={ref}>A</BsDropdownItem>), '.dropdown-item');

    expect(ref.current).toBe(item);
  });
});

describe('React BsDropdownHeader and BsDropdownDivider', () => {
  it('renders a presentational dropdown-header, merging className', async () => {
    const header = await renderEl(inMenu(<BsDropdownHeader className="mine">Group</BsDropdownHeader>), '.dropdown-header');

    expect([...header.classList]).toEqual(['dropdown-header', 'mine']);
    expect(header.getAttribute('role')).toBe('presentation');
    expect(header.textContent).toBe('Group');
  });

  it('renders a separator-role dropdown-divider', async () => {
    const divider = await renderEl(inMenu(<BsDropdownDivider />), '.dropdown-divider');

    expect(divider.className).toBe('dropdown-divider');
    expect(divider.getAttribute('role')).toBe('separator');
  });
});
