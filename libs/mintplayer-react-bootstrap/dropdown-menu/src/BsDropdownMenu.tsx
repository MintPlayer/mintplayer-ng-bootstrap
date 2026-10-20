import * as React from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  DROPDOWN_MENU_SCOPE,
  attachDropdownMenu,
  connectDropdownMenu,
  dropdownMenuScopedStyles,
  type DropdownSelectEventDetail,
} from '@mintplayer/ui-core/dropdown-menu';
import { reactProps } from '../../machine/src/react-props';

/* Omits React's native `onSelect` (a text-selection event) because this
   component's `onSelect` is the menu-item selection and collides by name. */
export interface BsDropdownMenuProps extends Omit<React.HTMLAttributes<HTMLUListElement>, 'onSelect'> {
  /** Pixel cap on the menu height; scrolls beyond. */
  maxHeight?: number;
  /** Fires when an enabled item is activated; `value` carries the item's value. */
  onSelect?: (detail: DropdownSelectEventDetail) => void;
  children?: React.ReactNode;
}

/**
 * `BsDropdownMenu` — a Bootstrap `.dropdown-menu` list (#437).
 *
 *     <BsDropdownMenu onSelect={({ value }) => console.log(value)}>
 *       <BsDropdownHeader>Section</BsDropdownHeader>
 *       <BsDropdownItem value="a"><a href="/a">First</a></BsDropdownItem>
 *       <BsDropdownDivider />
 *       <BsDropdownItem value="b"><button type="button">Second</button></BsDropdownItem>
 *     </BsDropdownMenu>
 *
 * Renders the markup of `@mintplayer/ui-core/dropdown-menu`: a `<ul>` around
 * the item `<li>`s. Once hydrated, the core's attachment adds the menu roles,
 * the roving tabindex, the arrow keys and `onSelect`; the server output is a
 * plain list of links, which is valid and works with JavaScript off.
 */
export const BsDropdownMenu = forwardRef<HTMLUListElement | null, BsDropdownMenuProps>(function BsDropdownMenu(
  { maxHeight, onSelect, className, style, children, ...rest },
  ref,
) {
  installLightStyles(DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles);

  const menuRef = useRef<HTMLUListElement>(null);
  useImperativeHandle(ref, () => menuRef.current);
  const [hydrated, setHydrated] = useState(false);

  const latest = useRef(onSelect);
  latest.current = onSelect;
  useEffect(() => {
    setHydrated(true);
    const menu = menuRef.current;
    if (!menu) return;
    return attachDropdownMenu(menu, { onSelect: (detail) => latest.current?.(detail) });
  }, []);

  const { class: menuClass, ...bag } = connectDropdownMenu({ hydrated });
  return (
    <ul
      ref={menuRef}
      {...reactProps(bag)}
      {...rest}
      style={maxHeight === undefined ? style : ({ ...style, '--mp-dropdown-max-height': `${maxHeight}px` } as React.CSSProperties)}
      className={[String(menuClass), className].filter(Boolean).join(' ')}>
      {children}
    </ul>
  );
});
