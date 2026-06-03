import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpDropdownHeader } from '@mintplayer/web-components/dropdown-menu';

/**
 * `<BsDropdownHeader>` — a Bootstrap `.dropdown-header` labelling a group of
 * items inside `<BsDropdownMenu>`. Slot content (the label) is passed as
 * children. Side-effect-registers the WC on import.
 */
export const BsDropdownHeader = createComponent({
  react: React,
  tagName: 'mp-dropdown-header',
  elementClass: MpDropdownHeader,
});
