import { defineCore } from '@mintplayer/ui-core/component';
import {
  applyShellState,
  connectShell,
  focusShellContent,
  shouldDismissShell,
  toggleShell,
  type ShellBreakpoint,
  type ShellLabels,
  type ShellState,
  type ShellView,
} from './shell';

/**
 * The shell as a D10 component (#458 M4). The markup contract stays in
 * `connectShell`; this core adds the inputs, the `statechange` output, the
 * `toggle()` method and the listeners (the hamburger checkboxes, the skip
 * link, `dismissOnNavigate`), all delegated from the root.
 */

/** Payload of `statechange`: whether the sidebar is now open. */
export interface ShellStateChange {
  open: boolean;
}

export interface ShellInputs {
  /** `auto` (responsive), `show` (force open) or `hide` (force closed). */
  state: ShellState;
  /** Breakpoint below which the sidebar overlays the content. */
  breakpoint: ShellBreakpoint;
  /** Expanded sidebar width (any CSS length); null keeps the sheet's 15rem. */
  size: string | null;
  /** Hides the built-in hamburger; drive the shell through `state` or `toggle()`. */
  externalToggle: boolean;
  /** Closes the overlay drawer when a sidebar link is clicked (narrow mode only). */
  dismissOnNavigate: boolean;
  /** Localized accessible names; missing keys fall back to English. */
  labels: Partial<ShellLabels> | null;
}

export interface ShellMethods {
  /** Open or close the sidebar in the current viewport mode. */
  toggle(force?: boolean): void;
}

export interface ShellComponentView extends ShellView {
  /** The width override on `.sidebar-root`, which holds both rules that read it. */
  readonly sizeStyle: Record<string, string>;
}

export const shellCore = defineCore<
  ShellInputs,
  object,
  { view: ShellComponentView },
  { statechange: ShellStateChange },
  undefined,
  undefined,
  ShellMethods
>({
  view: ({ inputs, id, hydrated }) => ({
    view: {
      ...connectShell({
        id,
        state: inputs.state,
        breakpoint: inputs.breakpoint,
        externalToggle: inputs.externalToggle,
        labels: inputs.labels,
        hydrated,
      }),
      sizeStyle: (inputs.size ? { '--mp-shell-size': inputs.size } : {}) as Record<string, string>,
    },
  }),
  attach: (api) => {
    const root = api.host;
    const onChange = (event: Event) => {
      const target = event.target;
      // Only this shell's own checkboxes (its direct children), never a nested shell's.
      if (!(target instanceof HTMLInputElement) || !target.classList.contains('shell-toggle')) return;
      if (target.parentElement !== root) return;
      api.emit('statechange', { open: target.checked });
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const skip = target?.closest?.('.skip-link');
      if (skip && skip.parentElement === root) {
        focusShellContent(event, root);
        return;
      }
      if (api.inputs().dismissOnNavigate && shouldDismissShell(event, root)) {
        const open = toggleShell(root, false);
        if (open !== null) api.emit('statechange', { open });
      }
    };
    root.addEventListener('change', onChange);
    root.addEventListener('click', onClick);
    return () => {
      root.removeEventListener('change', onChange);
      root.removeEventListener('click', onClick);
    };
  },
  // The bags set the initial checks (what SSR emits); a later `state` must also
  // reach a checkbox the user already flipped, whose attribute no longer rules.
  inputsChanged: (api, prev) => {
    if (api.inputs().state !== prev.state) applyShellState(api.host, api.inputs().state);
  },
  methods: {
    toggle: (api, force) => {
      const open = toggleShell(api.host, force);
      if (open !== null) api.emit('statechange', { open });
    },
  },
});
