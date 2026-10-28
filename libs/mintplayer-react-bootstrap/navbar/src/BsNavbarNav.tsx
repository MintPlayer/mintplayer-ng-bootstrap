import * as React from 'react';
import { connectNavbarNav } from '@mintplayer/ui-core/navbar';
import { NavbarNavTemplate } from './generated/navbar-nav.view.generated';

export interface BsNavbarNavProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `end` pushes the group to the far edge when the bar is wide. */
  align?: 'start' | 'end';
  children?: React.ReactNode;
}

/** `BsNavbarNav` — a `.navbar-nav` group of `BsNavbarItem`s and `BsNavbarDropdown`s. */
export const BsNavbarNav = React.forwardRef<HTMLDivElement, BsNavbarNavProps>(function BsNavbarNav(
  { align, className, children, ...rest },
  ref,
) {
  return (
    <NavbarNavTemplate bag={connectNavbarNav(align)} className={className} attrs={rest} rootRef={ref}>
      {children}
    </NavbarNavTemplate>
  );
});
