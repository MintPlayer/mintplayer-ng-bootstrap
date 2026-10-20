import * as React from 'react';
import { useContext } from 'react';
import { connectNavbarDropdown } from '@mintplayer/ui-core/navbar';
import { reactProps } from '../../machine/src/react-props';
import { NavbarNestingContext } from './navbar-context';

export interface BsNavbarDropdownProps extends React.DetailsHTMLAttributes<HTMLDetailsElement> {
  /** The trigger content — any node (give an icon-only label an `aria-label`). */
  label: React.ReactNode;
  /** Highlights the trigger, e.g. while a descendant link's route is active. */
  active?: boolean;
  /** `BsNavbarItem`s and nested `BsNavbarDropdown`s (submenus). */
  children?: React.ReactNode;
}

/**
 * `BsNavbarDropdown` — a navbar dropdown, or a submenu when nested.
 *
 *     <BsNavbarDropdown label="Products">
 *       <BsNavbarItem><a href="/widgets">Widgets</a></BsNavbarItem>
 *       <BsNavbarDropdown label="More">…</BsNavbarDropdown>
 *     </BsNavbarDropdown>
 *
 * A native `<details>`: the label is the `<summary>`, the items its
 * `.dropdown-menu` panel, so it opens with JavaScript off. Dropdowns at one
 * depth share a `name`, so opening one closes its siblings. Disclosure
 * navigation, not an ARIA menu: every link stays a link in the tab order.
 */
export const BsNavbarDropdown = React.forwardRef<HTMLDetailsElement, BsNavbarDropdownProps>(function BsNavbarDropdown(
  { label, active, className, children, ...rest },
  ref,
) {
  const depth = useContext(NavbarNestingContext).depth + 1;
  const view = connectNavbarDropdown({ depth, active });
  const { class: detailsClass, ...detailsBag } = view.details;
  return (
    <details
      ref={ref}
      {...reactProps(detailsBag)}
      {...rest}
      className={[String(detailsClass), className].filter(Boolean).join(' ')}>
      <summary {...reactProps(view.summary)}>{label}</summary>
      <div {...reactProps(view.panel)}>
        <NavbarNestingContext.Provider value={{ depth }}>{children}</NavbarNestingContext.Provider>
      </div>
    </details>
  );
});
