import * as React from 'react';

export interface BsDropdownItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, 'value'> {
  /** Bootstrap `.active` appearance (also drives `aria-selected` in a listbox menu). */
  active?: boolean;
  /** Non-interactive; removed from the menu's roving order. */
  disabled?: boolean;
  /** Opaque value carried in the menu's `select` event detail. */
  value?: unknown;
}

/**
 * `<BsDropdownItem>` — a Bootstrap `.dropdown-item` for use inside
 * `<BsDropdownMenu>`. There is no per-item web component: it renders a plain
 * light-DOM `<li class="dropdown-item">` that the menu WC styles via its shadow
 * `::slotted(.dropdown-item)` rule. Put the navigable content inside, e.g.
 * `<BsDropdownItem><a href="/x">Action</a></BsDropdownItem>` (the companion
 * stylesheet resets the nested link). The opaque `value` is assigned as a `value`
 * property on the `<li>` so the menu can carry it in its `select` event.
 */
export const BsDropdownItem = React.forwardRef<HTMLLIElement, BsDropdownItemProps>(
  function BsDropdownItem({ active, disabled, value, className, children, ...rest }, ref) {
    const innerRef = React.useRef<HTMLLIElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLLIElement);
    React.useEffect(() => {
      if (innerRef.current) (innerRef.current as unknown as { value?: unknown }).value = value;
    }, [value]);

    const classes = ['dropdown-item', active ? 'active' : '', disabled ? 'disabled' : '', className ?? '']
      .filter(Boolean)
      .join(' ');

    return (
      <li ref={innerRef} className={classes} aria-disabled={disabled ? true : undefined} {...rest}>
        {children}
      </li>
    );
  },
);
