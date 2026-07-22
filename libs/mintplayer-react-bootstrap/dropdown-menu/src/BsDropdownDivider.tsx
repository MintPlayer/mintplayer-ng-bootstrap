import * as React from 'react';

/**
 * `<BsDropdownDivider>` — a Bootstrap `.dropdown-divider` separating groups of
 * items inside `<BsDropdownMenu>`. Renders a plain `<li class="dropdown-divider">`
 * that the menu WC styles via `::slotted(.dropdown-divider)`.
 */
export const BsDropdownDivider = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  function BsDropdownDivider({ className, ...rest }, ref) {
    const classes = ['dropdown-divider', className ?? ''].filter(Boolean).join(' ');
    return <li ref={ref} role="separator" className={classes} {...rest} />;
  },
);
