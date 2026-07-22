import * as React from 'react';

/**
 * `<BsDropdownHeader>` — a Bootstrap `.dropdown-header` labelling a group of items
 * inside `<BsDropdownMenu>`. Renders a plain `<li class="dropdown-header">` that
 * the menu WC styles via `::slotted(.dropdown-header)`. The label is the children.
 */
export const BsDropdownHeader = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  function BsDropdownHeader({ className, children, ...rest }, ref) {
    const classes = ['dropdown-header', className ?? ''].filter(Boolean).join(' ');
    return (
      <li ref={ref} className={classes} {...rest}>
        {children}
      </li>
    );
  },
);
