import * as React from 'react';

/**
 * `<BsDropdownDivider>` — a Bootstrap `.dropdown-divider` separating groups of
 * items inside `<BsDropdownMenu>`. Renders a plain `<li class="dropdown-divider">`
 * styled by the menu sheet.
 */
export const BsDropdownDivider = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  function BsDropdownDivider({ className, ...rest }, ref) {
    const classes = ['dropdown-divider', className ?? ''].filter(Boolean).join(' ');
    return <li ref={ref} role="separator" className={classes} {...rest} />;
  },
);
