import { isValidThemeMode } from './cookie';
import { BS_THEME_DEFAULT_MODES, type BsThemeToggleMode } from './toggle-modes';

/** The theme toggle's scope: every node it renders carries `data-mps="theme-toggle"`. */
export const THEME_TOGGLE_SCOPE = 'theme-toggle';

/** How long an announcement stays in the live region before it clears itself. */
export const THEME_TOGGLE_ANNOUNCE_MS = 5000;

function isUsableEntry(entry: unknown): entry is BsThemeToggleMode {
  return !!entry && typeof entry === 'object' && isValidThemeMode((entry as BsThemeToggleMode).mode);
}

const normalised = new WeakMap<object, readonly BsThemeToggleMode[]>();

/**
 * The cycle a `modes` input stands for. `null` / `undefined` is the default
 * cycle. Entries whose `mode` fails `isValidThemeMode` are dropped with a
 * warning, and a list with no usable entry falls back to the default with a
 * warning, so the control is never left with nothing to cycle. The result is
 * cached per list, so a list warns once however often a front renders it.
 */
export function normaliseModes(value: readonly BsThemeToggleMode[] | null | undefined): readonly BsThemeToggleMode[] {
  if (value === null || value === undefined) return BS_THEME_DEFAULT_MODES;
  const cached = normalised.get(value);
  if (cached) return cached;
  const list = Array.isArray(value) ? (value as readonly unknown[]) : [];
  const dropped = list.filter((entry) => !isUsableEntry(entry));
  if (dropped.length) {
    // eslint-disable-next-line no-console
    console.warn('[theme-toggle] dropped modes entries: a mode must match /^[a-z0-9-]{1,32}$/i.', dropped);
  }
  const usable = list.filter(isUsableEntry);
  if (!usable.length) {
    // eslint-disable-next-line no-console
    console.warn('[theme-toggle] modes has no usable entry; falling back to BS_THEME_DEFAULT_MODES.');
  }
  const result = usable.length ? usable : BS_THEME_DEFAULT_MODES;
  normalised.set(value, result);
  return result;
}

/**
 * The entry shown and the one a click selects. A current mode that is not in
 * the list shows entry 0 and cycles to entry 1.
 */
export function toggleEntries(
  modes: readonly BsThemeToggleMode[],
  mode: string | null,
): { current: BsThemeToggleMode; next: BsThemeToggleMode } {
  const current = mode?.toLowerCase() ?? null;
  const index = Math.max(0, modes.findIndex((entry) => entry.mode.toLowerCase() === current));
  return { current: modes[index], next: modes[(index + 1) % modes.length] };
}

export type ThemeToggleBag = Record<string, string | number | boolean | null>;

export interface ThemeToggleOptions {
  readonly id: string;
  readonly modes: readonly BsThemeToggleMode[];
  /** The store's mode; `null` on the server and before hydration. */
  readonly mode: string | null;
  readonly hydrated: boolean;
  /** The pending live announcement. */
  readonly announcement: string;
}

export interface ThemeToggleView {
  root: ThemeToggleBag;
  button: ThemeToggleBag;
  icon: ThemeToggleBag;
  path: ThemeToggleBag;
  description: ThemeToggleBag;
  descriptionText: string;
  live: ThemeToggleBag;
  liveText: string;
}

/**
 * The bags. The button's name is the NEXT entry's `label` (the action); its
 * description is the CURRENT entry's `announcement`, rewritten in the same
 * render. A toggle cannot work without JavaScript, so the button is disabled
 * until hydrated; no-JS visitors still get OS-following colours from the
 * pre-boot script and the stylesheet.
 */
export function connectThemeToggle(options: ThemeToggleOptions): ThemeToggleView {
  const { id, modes, mode, hydrated, announcement } = options;

  const { current, next } = toggleEntries(modes, mode);
  const descriptionId = `${id}-current`;
  // One path: subpaths concatenate, and the icons' subpaths never overlap.
  const d = typeof current.icon === 'string' ? current.icon : current.icon.join(' ');
  return {
    root: { class: 'theme-toggle' },
    button: {
      type: 'button',
      class: 'theme-toggle-button',
      'aria-label': next.label,
      'aria-describedby': descriptionId,
      disabled: !hydrated,
    },
    icon: { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    path: { d },
    description: { id: descriptionId, class: 'visually-hidden' },
    descriptionText: current.announcement,
    live: { class: 'visually-hidden', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
    liveText: announcement,
  };
}
