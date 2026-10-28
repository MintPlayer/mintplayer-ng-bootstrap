import { defineCore } from '@mintplayer/ui-core/component';
import { getBsThemeStore } from './store';
import { THEME_TOGGLE_ANNOUNCE_MS, connectThemeToggle, normaliseModes, toggleEntries, type ThemeToggleView } from './theme-toggle';
import type { BsThemeToggleMode } from './toggle-modes';

/**
 * The theme toggle's core (PRD #437 D10, dark-mode D7): what the generated
 * Angular, React, Vue and Lit components host. `theming.component.ts` is its
 * manifest and `templates/theme-toggle.view.vue` its markup.
 *
 * State lives in the theme store (`getBsThemeStore()`), never in a front: the
 * core mirrors the store's mode while attached, and a click calls `setMode()`.
 * Anything else that changes the mode (a framework service, another tab)
 * re-renders the toggle.
 */

export interface ThemeToggleInputs {
  /**
   * The cycle, in order; `null` is `BS_THEME_DEFAULT_MODES`. Entries with an
   * invalid `mode` are dropped with a warning. More than about three modes
   * wants a menu (radio group) instead.
   */
  modes: readonly BsThemeToggleMode[] | null;
}

export interface ThemeToggleState {
  /** The store's mode, mirrored for rendering. `null` until attached in a browser. */
  mode: string | null;
  announcement: string;
}

const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export const themeToggleCore = defineCore<ThemeToggleInputs, ThemeToggleState, { view: ThemeToggleView }>({
  state: () => ({ mode: null, announcement: '' }),
  view: ({ inputs, state, id, hydrated }) => ({
    view: connectThemeToggle({
      id,
      modes: normaliseModes(inputs.modes),
      mode: state.mode,
      hydrated,
      announcement: state.announcement,
    }),
  }),
  attach: (api) => {
    const store = getBsThemeStore();
    const sync = () => {
      const mode = store.getMode();
      if (mode !== api.state().mode) api.setState({ mode });
    };
    const onClick = (event: Event) => {
      const button = (event.target as Element).closest?.('button');
      if (!button || !api.host.contains(button)) return;
      const { next } = toggleEntries(normaliseModes(api.inputs().modes), api.state().mode);
      store.setMode(next.mode);
      // setMode does not notify for an unchanged mode, so re-read.
      sync();
      // A transient event: it goes out once through the live region and clears
      // itself, while the description stays re-readable.
      clearTimeout(timers.get(api.host));
      api.setState({ announcement: next.announcement });
      timers.set(api.host, setTimeout(() => api.setState({ announcement: '' }), THEME_TOGGLE_ANNOUNCE_MS));
    };
    const unsubscribe = store.subscribe(sync);
    api.host.addEventListener('click', onClick);
    sync();
    return () => {
      unsubscribe();
      api.host.removeEventListener('click', onClick);
      clearTimeout(timers.get(api.host));
    };
  },
});
