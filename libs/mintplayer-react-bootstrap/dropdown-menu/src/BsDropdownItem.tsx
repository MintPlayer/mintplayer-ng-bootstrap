import * as React from 'react';
import type { DropdownItemElement } from '@mintplayer/ui-core/dropdown-menu';

export interface BsDropdownItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, 'value'> {
  /** Bootstrap `.active` appearance. */
  active?: boolean;
  /** Non-interactive; removed from the menu's roving order. */
  disabled?: boolean;
  /** Opaque value reported by the menu's `onSelect`. */
  value?: unknown;
}

/**
 * `BsDropdownItem` — a Bootstrap `.dropdown-item` inside `BsDropdownMenu`.
 * Put the navigable control inside, e.g.
 * `<BsDropdownItem><a href="/x">Action</a></BsDropdownItem>`; the menu's
 * scoped sheet makes it fill the item row. The opaque `value` is assigned as
 * the `dropdownValue` property on the `<li>` — not as `value`, which
 * `HTMLLIElement` owns as a native long (an object or string becomes 0).
 */
export const BsDropdownItem = React.forwardRef<HTMLLIElement, BsDropdownItemProps>(
  function BsDropdownItem({ active, disabled, value, className, children, ...rest }, ref) {
    const innerRef = React.useRef<HTMLLIElement & DropdownItemElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLLIElement);
    React.useEffect(() => {
      if (innerRef.current) innerRef.current.dropdownValue = value;
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
