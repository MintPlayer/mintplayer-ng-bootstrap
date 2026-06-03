import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpShell,
  type ShellState,
  type ShellStateChangeEventDetail,
} from '@mintplayer/web-components/shell';

/** Bootstrap breakpoint names accepted by `breakpoint`. */
export type ShellBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface BsShellProps {
  /** `auto` (default, responsive) | `show` (force open) | `hide` (force closed). */
  state?: ShellState;
  /** Breakpoint below which the sidebar starts collapsed. Default `md`. */
  breakpoint?: ShellBreakpoint;
  /** Expanded sidebar width (any CSS length), e.g. `"15rem"`. */
  size?: string;
  /** Hide the built-in hamburger and drive the toggle from a consumer-supplied control. */
  externalToggle?: boolean;
  /** Auto-close the overlay drawer when a sidebar link is clicked (narrow mode only). */
  dismissOnNavigate?: boolean;
  /** Fires when the sidebar toggle flips. */
  onStatechange?: (event: CustomEvent<ShellStateChangeEventDetail>) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Inner `@lit/react` component. `state`/`breakpoint`/`size` aren't reactive
 * element *properties* (the WC reads them as attributes to keep the layout
 * pure-CSS / SSR- and no-JS-friendly), so `createComponent` forwards them as
 * React props → attributes. We retype its props to the clean public surface;
 * the runtime forwards everything to the element unchanged.
 */
type MpShellInnerProps = Omit<BsShellProps, 'externalToggle' | 'dismissOnNavigate'> & {
  'external-toggle'?: '';
  'dismiss-on-navigate'?: '';
} & React.RefAttributes<MpShell>;

const MpShellComponent = createComponent({
  react: React,
  tagName: 'mp-shell',
  elementClass: MpShell,
  events: {
    onStatechange: 'statechange' as EventName<CustomEvent<ShellStateChangeEventDetail>>,
  },
}) as unknown as React.ForwardRefExoticComponent<MpShellInnerProps>;

/**
 * React wrapper for `<mp-shell>` — the responsive sidebar layout shell.
 * Side-effect-registers the WC on import.
 *
 * The layout is server-rendered as Declarative Shadow DOM (see
 * `injectMpShellDsd` in `@mintplayer/web-components/shell/ssr`), so the sidebar
 * and its hamburger toggle work with JavaScript disabled. Place the sidebar as
 * a child with `slot="sidebar"`; any other children are the main content.
 *
 *     <BsShell breakpoint="md">
 *       <nav slot="sidebar">…</nav>
 *       <main>…</main>
 *     </BsShell>
 */
export const BsShell = React.forwardRef<MpShell, BsShellProps>(function BsShell(
  { externalToggle, dismissOnNavigate, ...props },
  ref,
) {
  return (
    <MpShellComponent
      ref={ref}
      {...(externalToggle ? { 'external-toggle': '' as const } : {})}
      {...(dismissOnNavigate ? { 'dismiss-on-navigate': '' as const } : {})}
      {...props}
    />
  );
});
