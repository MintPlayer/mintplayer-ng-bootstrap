import * as React from 'react';
import { useContext } from 'react';
import { connectNavbarItem } from '@mintplayer/ui-core/navbar';
import { NavbarItemTemplate } from './generated/navbar-item.view.generated';
import { NavbarNestingContext } from './navbar-context';

export interface BsNavbarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The current page (`aria-current`). */
  active?: boolean;
  disabled?: boolean;
  /** The item's link or button. */
  children?: React.ReactNode;
}

/**
 * `BsNavbarItem` — one entry around a consumer link: a `.nav-item` in a
 * `BsNavbarNav`, a `.dropdown-item` inside a `BsNavbarDropdown`.
 */
export const BsNavbarItem = React.forwardRef<HTMLDivElement, BsNavbarItemProps>(function BsNavbarItem(
  { active, disabled, className, children, ...rest },
  ref,
) {
  const { depth } = useContext(NavbarNestingContext);
  return (
    <NavbarItemTemplate bag={connectNavbarItem({ inMenu: depth >= 0, active, disabled })} className={className} attrs={rest} rootRef={ref}>
      {children}
    </NavbarItemTemplate>
  );
});
