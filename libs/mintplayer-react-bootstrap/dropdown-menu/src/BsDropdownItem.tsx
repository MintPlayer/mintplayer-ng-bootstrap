import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpDropdownItem } from '@mintplayer/web-components/dropdown-menu';

/**
 * `<BsDropdownItem>` — a Bootstrap `.dropdown-item` for use inside
 * `<BsDropdownMenu>`. Renders the `<mp-dropdown-item>` custom element directly,
 * so it projects cleanly into the menu's default slot. Side-effect-registers
 * the WC on import.
 *
 * Props mirror the element's properties: `selected` (current/active item),
 * `disabled` (non-interactive, removed from the roving order) and `value` (the
 * opaque value carried in the menu's `select` event detail — set any JS value;
 * createComponent forwards it as an element property). Slot content (the label)
 * is passed as children.
 */
export const BsDropdownItem = createComponent({
  react: React,
  tagName: 'mp-dropdown-item',
  elementClass: MpDropdownItem,
});
