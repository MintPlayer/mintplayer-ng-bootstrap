import * as React from 'react';
import { DROPDOWN_MENU_SCOPE } from '@mintplayer/ui-core/dropdown-menu';

/**
 * `<BsDropdownHeader>` — a Bootstrap `.dropdown-header` labelling a group of items
 * inside `<BsDropdownMenu>`. Renders a plain `<li class="dropdown-header">`, styled by
 * the menu sheet. The label is the children.
 */
export const BsDropdownHeader = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  function BsDropdownHeader({ className, children, ...rest }, ref) {
    const classes = ['dropdown-header', className ?? ''].filter(Boolean).join(' ');
    return (
      <li ref={ref} className={classes} data-mps={DROPDOWN_MENU_SCOPE} {...rest}>
        {children}
      </li>
    );
  },
);
