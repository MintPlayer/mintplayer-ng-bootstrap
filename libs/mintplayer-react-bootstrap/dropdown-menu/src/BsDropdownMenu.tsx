import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpDropdownMenu,
  type DropdownMode,
  type DropdownSelectEventDetail,
} from '@mintplayer/web-components/dropdown-menu';

export interface BsDropdownMenuProps {
  /** `menu` (default, roving-tabindex keyboard nav) | `listbox`. */
  mode?: DropdownMode;
  /** px cap on the menu height; scrolls beyond. Maps to the `max-height` attribute. */
  maxHeight?: number;
  /** id of an external label, set as `aria-labelledby` on the list. Maps to `label-id`. */
  labelId?: string;
  /** Fires when an enabled item is activated; `detail.value` carries the item's value. */
  onSelect?: (event: CustomEvent<DropdownSelectEventDetail>) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Inner `@lit/react` component. `mode`/`maxHeight`/`labelId` are surfaced to the
 * WC as attributes (`mode`, `max-height`, `label-id`) — the layout/roles read the
 * attributes to keep the menu SSR- and no-JS-friendly — so `createComponent`
 * forwards them as React props → attributes. We retype its props to the clean
 * public surface; the runtime forwards everything to the element unchanged.
 */
type MpDropdownMenuInnerProps = Omit<BsDropdownMenuProps, 'maxHeight' | 'labelId'> & {
  'max-height'?: number;
  'label-id'?: string;
} & React.RefAttributes<MpDropdownMenu>;

const MpDropdownMenuComponent = createComponent({
  react: React,
  tagName: 'mp-dropdown-menu',
  elementClass: MpDropdownMenu,
  events: {
    onSelect: 'select' as EventName<CustomEvent<DropdownSelectEventDetail>>,
  },
}) as unknown as React.ForwardRefExoticComponent<MpDropdownMenuInnerProps>;

/**
 * React wrapper for `<mp-dropdown-menu>` — a Bootstrap `.dropdown-menu`.
 * Side-effect-registers the WC on import.
 *
 * The menu chrome is server-rendered as Declarative Shadow DOM (see
 * `injectMpDropdownDsd` in `@mintplayer/web-components/dropdown-menu/ssr`), so it
 * renders styled with JavaScript disabled. Slot `<BsDropdownItem>` /
 * `<BsDropdownDivider>` / `<BsDropdownHeader>` children. In `menu` mode (default)
 * the menu provides roving-tabindex keyboard navigation over the enabled items.
 *
 *     <BsDropdownMenu onSelect={(e) => console.log(e.detail.value)}>
 *       <BsDropdownHeader>Section</BsDropdownHeader>
 *       <BsDropdownItem value="a">First</BsDropdownItem>
 *       <BsDropdownDivider />
 *       <BsDropdownItem value="b" selected>Second</BsDropdownItem>
 *     </BsDropdownMenu>
 */
export const BsDropdownMenu = React.forwardRef<MpDropdownMenu, BsDropdownMenuProps>(function BsDropdownMenu(
  { maxHeight, labelId, ...props },
  ref,
) {
  return (
    <MpDropdownMenuComponent
      ref={ref}
      {...(maxHeight != null ? { 'max-height': maxHeight } : {})}
      {...(labelId != null ? { 'label-id': labelId } : {})}
      {...props}
    />
  );
});
