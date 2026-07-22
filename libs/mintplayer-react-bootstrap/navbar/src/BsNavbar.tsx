import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpNavbar,
  type NavbarBreakpoint,
  type NavbarExpandedChangeEventDetail,
} from '@mintplayer/web-components/navbar';

export interface BsNavbarProps {
  /** Bootstrap breakpoint name (`xs`…`xxl`, default `md`); at/above it the nav is inline. */
  breakpoint?: NavbarBreakpoint;
  /** Background: a theme color (`primary`…`dark`) or adaptive `body` / `body-secondary` / `body-tertiary`. */
  color?: string;
  /** Programmatic collapse state (narrow mode); reflects the toggle. */
  expanded?: boolean;
  /** `fixed` pins the bar to the top of the viewport, full width; omit for in-flow. */
  positioning?: 'fixed';
  /** Landmark label for the `<nav>` (default `Main navigation`). Maps to `aria-label`. */
  ariaLabel?: string;
  /** Fires when the collapse toggles; `detail.expanded` carries the new state. */
  onExpandedChange?: (event: CustomEvent<NavbarExpandedChangeEventDetail>) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Inner `@lit/react` component. `breakpoint`/`color` aren't reactive element
 * *properties* (the WC reads them as attributes to keep the collapse pure-CSS /
 * SSR- and no-JS-friendly), so `createComponent` forwards them as React props →
 * attributes. `ariaLabel` is surfaced as the `aria-label` attribute, and
 * `expanded` as the reflected boolean attribute. We retype its props to the
 * clean public surface; the runtime forwards everything to the element unchanged.
 */
type MpNavbarInnerProps = Omit<BsNavbarProps, 'ariaLabel' | 'expanded'> & {
  'aria-label'?: string;
  expanded?: '';
} & React.RefAttributes<MpNavbar>;

const MpNavbarComponent = createComponent({
  react: React,
  tagName: 'mp-navbar',
  elementClass: MpNavbar,
  events: {
    onExpandedChange: 'expandedchange' as EventName<CustomEvent<NavbarExpandedChangeEventDetail>>,
  },
}) as unknown as React.ForwardRefExoticComponent<MpNavbarInnerProps>;

/**
 * React wrapper for `<mp-navbar>` — the responsive Bootstrap navbar.
 * Side-effect-registers the WC on import.
 *
 * The bar chrome (hamburger toggle, collapsible region) is server-rendered as
 * Declarative Shadow DOM (see `injectMpNavbarDsd` in
 * `@mintplayer/web-components/navbar/ssr`), so it collapses/reveals via its
 * pure-CSS state machine with JavaScript disabled. Place the brand in
 * `<BsNavbarBrand slot="brand">`, left items as default `<BsNavbarItem>`
 * children, and right-aligned items with `slot="end"`.
 *
 *     <BsNavbar breakpoint="lg" color="body-tertiary">
 *       <BsNavbarBrand slot="brand"><a href="/">MyApp</a></BsNavbarBrand>
 *       <BsNavbarItem active><a href="/home">Home</a></BsNavbarItem>
 *     </BsNavbar>
 */
export const BsNavbar = React.forwardRef<MpNavbar, BsNavbarProps>(function BsNavbar(
  { ariaLabel, expanded, ...props },
  ref,
) {
  return (
    <MpNavbarComponent
      ref={ref}
      {...(ariaLabel != null ? { 'aria-label': ariaLabel } : {})}
      {...(expanded ? { expanded: '' as const } : {})}
      {...props}
    />
  );
});
