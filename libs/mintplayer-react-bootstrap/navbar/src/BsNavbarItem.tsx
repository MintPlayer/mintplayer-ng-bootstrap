import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpNavbarItem } from '@mintplayer/web-components/navbar';

export interface BsNavbarItemProps extends React.HTMLAttributes<HTMLElement> {
  /** Current page (`.active` appearance). Reflected boolean attribute. */
  active?: boolean;
  /** Non-interactive. Reflected boolean attribute. */
  disabled?: boolean;
  /** Navbar slot; set `"end"` to place the item in the right-aligned group. */
  slot?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Inner `@lit/react` component. `active`/`disabled` drive `::slotted` styling as
 * presence-based boolean attributes (so the DSD chrome stays static), so
 * `createComponent` forwards them as React props → attributes. We retype its
 * props to the clean public surface; the forwardRef facade below translates the
 * booleans to attribute presence.
 */
type MpNavbarItemInnerProps = Omit<BsNavbarItemProps, 'active' | 'disabled'> & {
  active?: '';
  disabled?: '';
} & React.RefAttributes<MpNavbarItem>;

const MpNavbarItemComponent = createComponent({
  react: React,
  tagName: 'mp-navbar-item',
  elementClass: MpNavbarItem,
}) as unknown as React.ForwardRefExoticComponent<MpNavbarItemInnerProps>;

/**
 * React wrapper for `<mp-navbar-item>` — a navbar nav entry. Slot a real link
 * (`<a href>` / a router `<Link>`) as the child: it stays light DOM so it
 * navigates with no JavaScript, and is styled as a Bootstrap `.nav-link`.
 * Side-effect-registers the WC on import.
 *
 *     <BsNavbarItem active><a href="/home">Home</a></BsNavbarItem>
 */
export const BsNavbarItem = React.forwardRef<MpNavbarItem, BsNavbarItemProps>(function BsNavbarItem(
  { active, disabled, ...props },
  ref,
) {
  return (
    <MpNavbarItemComponent
      ref={ref}
      // Static so it exists in the DSD too (connectedCallback never runs
      // server-side); a consumer role in ...props wins by spreading later.
      {...(active ? { active: '' as const } : {})}
      {...(disabled ? { disabled: '' as const } : {})}
      {...props}
    />
  );
});
