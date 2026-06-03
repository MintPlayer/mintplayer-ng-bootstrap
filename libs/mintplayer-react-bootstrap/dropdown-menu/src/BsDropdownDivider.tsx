import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpDropdownDivider } from '@mintplayer/web-components/dropdown-menu';

/**
 * `<BsDropdownDivider>` — a Bootstrap `.dropdown-divider` separating groups of
 * items inside `<BsDropdownMenu>`. No props. Side-effect-registers the WC on
 * import.
 */
export const BsDropdownDivider = createComponent({
  react: React,
  tagName: 'mp-dropdown-divider',
  elementClass: MpDropdownDivider,
});
