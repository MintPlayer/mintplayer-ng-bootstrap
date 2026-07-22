import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpNavbarDropdown } from '@mintplayer/web-components/navbar';

export interface BsNavbarDropdownProps {
  /** Set when nesting the dropdown into a parent slot (e.g. `"end"`). */
  slot?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * React wrapper for `<mp-navbar-dropdown>` — a navbar entry that opens a
 * dropdown. Slot the trigger label with `slot="label"` and a `<BsDropdownMenu>`
 * as the default content (the panel). Nest one inside a `<BsDropdownItem>` to
 * make a submenu. Renders the custom element directly so children project
 * cleanly. Side-effect-registers the WC on import.
 *
 *     <BsNavbarDropdown>
 *       <span slot="label">Products</span>
 *       <BsDropdownMenu>
 *         <BsDropdownItem><a href="/p1">Product 1</a></BsDropdownItem>
 *       </BsDropdownMenu>
 *     </BsNavbarDropdown>
 */
export const BsNavbarDropdown = createComponent({
  react: React,
  tagName: 'mp-navbar-dropdown',
  elementClass: MpNavbarDropdown,
}) as unknown as React.ForwardRefExoticComponent<
  BsNavbarDropdownProps & React.RefAttributes<MpNavbarDropdown>
>;
