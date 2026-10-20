import * as React from 'react';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  SHELL_SCOPE,
  applyShellState,
  connectShell,
  focusShellContent,
  shellScopedStyles,
  shouldDismissShell,
  toggleShell,
  type ShellBreakpoint,
  type ShellLabels,
  type ShellState,
} from '@mintplayer/ui-core/shell';
import { reactProps } from '../../machine/src/react-props';

/** Payload of `onStatechange`: whether the sidebar is now open. */
export interface ShellStateChange {
  open: boolean;
}

export interface BsShellHandle {
  /** The `.shell` root element. */
  readonly element: HTMLDivElement | null;
  /** Open or close the sidebar in the current viewport mode. */
  toggle(force?: boolean): void;
}

export interface BsShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** `auto` (default, responsive) | `show` (force open) | `hide` (force closed). */
  state?: ShellState;
  /** Breakpoint below which the sidebar overlays the content. Default `md`. */
  breakpoint?: ShellBreakpoint;
  /** Expanded sidebar width (any CSS length), e.g. `"15rem"`. */
  size?: string;
  /** Hide the built-in hamburger and drive the shell through `state` or `toggle()`. */
  externalToggle?: boolean;
  /** Auto-close the overlay drawer when a sidebar link is clicked (narrow mode only). */
  dismissOnNavigate?: boolean;
  /** Localized accessible names; missing keys fall back to English. */
  labels?: Partial<ShellLabels>;
  /** Top-bar content, rendered after the hamburger. */
  topbar?: React.ReactNode;
  /** Sidebar content. */
  sidebar?: React.ReactNode;
  /** Fires when the sidebar opens or closes through the shell. */
  onStatechange?: (change: ShellStateChange) => void;
  /** The main content. */
  children?: React.ReactNode;
}

/**
 * Responsive app shell with a collapsible sidebar (#437), rendering the
 * markup of `@mintplayer/ui-core/shell`. The open state is a native checkbox
 * per viewport mode and every rule is CSS, so the server-rendered page works
 * with JavaScript off.
 *
 *     <BsShell topbar={<Brand />} sidebar={<nav>…</nav>}>
 *       …main content…
 *     </BsShell>
 */
export const BsShell = forwardRef<BsShellHandle, BsShellProps>(function BsShell(props, ref) {
  const {
    state = 'auto',
    breakpoint = 'md',
    size,
    externalToggle = false,
    dismissOnNavigate = false,
    labels,
    topbar,
    sidebar,
    onStatechange,
    onClick,
    className,
    style,
    children,
    ...rest
  } = props;

  installLightStyles(SHELL_SCOPE, shellScopedStyles);

  const reactId = useId();
  const id = `bs-shell-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const view = connectShell({ id, state, breakpoint, externalToggle, labels });
  const rootRef = useRef<HTMLDivElement>(null);

  const toggle = (force?: boolean) => {
    const open = rootRef.current ? toggleShell(rootRef.current, force) : null;
    if (open !== null) onStatechange?.({ open });
  };
  useImperativeHandle(ref, () => ({ get element() { return rootRef.current; }, toggle }));

  // The `defaultChecked` bags set the initial state (what SSR emits); a later
  // `state` change must also reach a checkbox the user already flipped.
  const appliedState = useRef(state);
  useEffect(() => {
    if (appliedState.current !== state && rootRef.current) applyShellState(rootRef.current, state);
    appliedState.current = state;
  }, [state]);

  const { class: rootClass, ...rootBag } = view.root;
  return (
    <div
      ref={rootRef}
      {...reactProps(rootBag)}
      {...rest}
      className={[String(rootClass), className].filter(Boolean).join(' ')}
      style={size ? ({ ...style, '--mp-shell-size': size } as React.CSSProperties) : style}
      onClick={(event) => {
        onClick?.(event);
        if (dismissOnNavigate && rootRef.current && shouldDismissShell(event.nativeEvent, rootRef.current)) toggle(false);
      }}
    >
      <a
        {...reactProps(view.skip)}
        href={view.skipHref}
        onClick={(event) => rootRef.current && focusShellContent(event.nativeEvent, rootRef.current)}
      >
        {view.skipText}
      </a>
      {view.toggles.map((t) => {
        // Uncontrolled: the user's flip is the state, React must not revert it.
        const { checked, ...input } = t.input;
        return (
          <input
            key={t.mode}
            {...reactProps(input)}
            defaultChecked={checked === true}
            onChange={(event) => onStatechange?.({ open: event.target.checked })}
          />
        );
      })}
      <div {...reactProps(view.topbar)}>
        {view.toggles.map((t) => <label key={t.mode} {...reactProps(t.label)}>{view.hamburgerText}</label>)}
        {topbar}
      </div>
      <div {...reactProps(view.sidebarRoot)}>
        <aside {...reactProps(view.sidebar)}>{sidebar}</aside>
        <div {...reactProps(view.content)}>{children}</div>
      </div>
    </div>
  );
});
