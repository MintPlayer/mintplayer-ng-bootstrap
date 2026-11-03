import * as React from 'react';
import { DROPDOWN_MENU_SCOPE } from '@mintplayer/ui-core/dropdown-menu';

/**
 * `<BsDropdownDivider>` — a Bootstrap `.dropdown-divider` separating groups of
 * items inside `<BsDropdownMenu>`. Renders a plain `<li class="dropdown-divider">`
 * styled by the menu sheet.
 */
export const BsDropdownDivider = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  function BsDropdownDivider({ className, ...rest }, ref) {
    const classes = ['dropdown-divider', className ?? ''].filter(Boolean).join(' ');
    return <li ref={ref} role="separator" className={classes} data-mps={DROPDOWN_MENU_SCOPE} {...rest} />;
  },
);
