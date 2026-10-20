import * as React from 'react';
import { connectNavbarNav } from '@mintplayer/ui-core/navbar';
import { reactProps } from '../../machine/src/react-props';

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
  const { class: navClass, ...bag } = connectNavbarNav(align);
  return (
    <div ref={ref} {...reactProps(bag)} {...rest} className={[String(navClass), className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
});
