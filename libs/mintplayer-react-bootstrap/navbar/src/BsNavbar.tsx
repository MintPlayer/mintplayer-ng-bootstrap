import * as React from 'react';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import { DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles } from '@mintplayer/ui-core/dropdown-menu';
import {
  NAVBAR_SCOPE,
  attachNavbar,
  connectNavbar,
  connectNavbarBrand,
  navbarScopedStyles,
  setNavbarExpanded,
  type NavbarBreakpoint,
  type NavbarExpandedChangeEventDetail,
  type NavbarLabels,
} from '@mintplayer/ui-core/navbar';
import { reactProps } from '../../machine/src/react-props';

export interface BsNavbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Bootstrap breakpoint name (`xs`…`xxl`, default `md`); at/above it the nav is inline. */
  breakpoint?: NavbarBreakpoint;
  /** Background: a theme color (`primary`…`dark`) or adaptive `body` / `body-secondary` / `body-tertiary`. */
  color?: string;
  /** Collapse state (narrow mode). Written when it changes; follow the toggle with `onExpandedChange`. */
  expanded?: boolean;
  /** `fixed` pins the bar to the top of the viewport, full width; omit for in-flow. */
  positioning?: 'fixed';
  /** Localized accessible names; `aria-label` names the landmark too. */
  labels?: Partial<NavbarLabels>;
  /** The brand, e.g. `<a href="/">MyApp</a>`. */
  brand?: React.ReactNode;
  /** A custom hamburger glyph; reads the open state from `--mp-navbar-expanded: 0|1`. */
  toggler?: React.ReactNode;
  /** Fires when the collapse opens or closes through the bar. */
  onExpandedChange?: (detail: NavbarExpandedChangeEventDetail) => void;
  /** `BsNavbarNav` groups. */
  children?: React.ReactNode;
}

/**
 * `BsNavbar` — Bootstrap navbar with a no-JS collapse and native `<details>`
 * dropdowns (#437).
 *
 *     <BsNavbar breakpoint="lg" color="body-tertiary" brand={<a href="/">MyApp</a>}>
 *       <BsNavbarNav>
 *         <BsNavbarItem active><a href="/home">Home</a></BsNavbarItem>
 *         <BsNavbarDropdown label="Products">…</BsNavbarDropdown>
 *       </BsNavbarNav>
 *       <BsNavbarNav align="end">…</BsNavbarNav>
 *     </BsNavbar>
 *
 * Renders the markup of `@mintplayer/ui-core/navbar`, so the server HTML is
 * the working bar: the collapse is a checkbox and every dropdown a
 * `<details>`, both of which work with JavaScript off.
 */
export const BsNavbar = forwardRef<HTMLElement | null, BsNavbarProps>(function BsNavbar(
  { breakpoint, color, expanded = false, positioning, labels, brand, toggler, onExpandedChange, className, children, ...rest },
  ref,
) {
  installLightStyles(NAVBAR_SCOPE, navbarScopedStyles);
  installLightStyles(DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles);

  const reactId = useId();
  const id = `bs-navbar-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rootRef = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => rootRef.current);
  const [hydrated, setHydrated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(expanded);

  const latest = useRef(onExpandedChange);
  latest.current = onExpandedChange;
  useEffect(() => {
    setHydrated(true);
    const root = rootRef.current;
    if (!root) return;
    return attachNavbar(root, {
      onExpandedChange: (next) => {
        setIsExpanded(next);
        latest.current?.({ expanded: next });
      },
    });
  }, []);

  // The checkbox owns the state; a changed prop is written through to it.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (rootRef.current && setNavbarExpanded(rootRef.current, expanded) !== null) setIsExpanded(expanded);
  }, [expanded]);

  const ariaLabel = rest['aria-label'];
  const view = connectNavbar({
    id,
    breakpoint,
    color,
    positioning,
    expanded: isExpanded,
    hydrated,
    labels: { ...(ariaLabel ? { nav: ariaLabel } : {}), ...(labels ?? {}) },
  });
  const { class: rootClass, ...rootBag } = view.root;
  // Uncontrolled: React must not fight the checkbox the user toggles.
  const { checked, ...toggleBag } = view.toggle;

  return (
    <nav
      ref={rootRef}
      {...reactProps(rootBag)}
      {...rest}
      className={[String(rootClass), className].filter(Boolean).join(' ')}>
      {brand !== undefined && <div {...reactProps(connectNavbarBrand())}>{brand}</div>}
      <input {...reactProps(toggleBag)} defaultChecked={!!checked} />
      <label {...reactProps(view.toggler)}>
        {toggler ?? (
          <>
            <span {...reactProps(view.bar)} />
            <span {...reactProps(view.bar)} />
            <span {...reactProps(view.bar)} />
          </>
        )}
      </label>
      <div {...reactProps(view.collapse)}>
        <div {...reactProps(view.inner)}>{children}</div>
      </div>
    </nav>
  );
});
