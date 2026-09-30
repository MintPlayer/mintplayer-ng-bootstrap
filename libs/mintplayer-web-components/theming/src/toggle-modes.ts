/**
 * One entry in `<mp-theme-toggle>`'s cycle (PRD dark-mode D7).
 *
 * - `mode` is what the toggle passes to `setMode()`; it must satisfy
 *   `isValidThemeMode`, or the entry is dropped.
 * - `label` names the button while this entry is the NEXT one: it describes
 *   the action ("Switch to dark theme").
 * - `announcement` names this entry while it is CURRENT ("Dark theme"). It is
 *   the button's description, and it is announced once after a click selects it.
 * - `icon` is SVG path data for a 16x16 viewBox, one string per `<path>`.
 */
export interface BsThemeToggleMode {
  mode: string;
  label: string;
  announcement: string;
  icon: string | readonly string[];
}

// Path data copied from bootstrap-icons 1.11.4 (MIT): circle-half, sun-fill, moon-stars-fill.
const CIRCLE_HALF = 'M8 15A7 7 0 1 0 8 1zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16';
const SUN_FILL =
  'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708';
const MOON_STARS_FILL = [
  'M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278',
  'M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.73 1.73 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.73 1.73 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.73 1.73 0 0 0 1.097-1.097zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z',
] as const;

/**
 * The default cycle: auto, then light, then dark. Localize by spreading it and
 * overriding the strings, e.g.
 * `BS_THEME_DEFAULT_MODES.map((m) => ({ ...m, label: t(m.label), announcement: t(m.announcement) }))`.
 */
export const BS_THEME_DEFAULT_MODES: readonly BsThemeToggleMode[] = Object.freeze([
  Object.freeze({
    mode: 'auto',
    label: 'Switch to auto theme',
    announcement: 'Auto theme',
    icon: CIRCLE_HALF,
  }),
  Object.freeze({
    mode: 'light',
    label: 'Switch to light theme',
    announcement: 'Light theme',
    icon: SUN_FILL,
  }),
  Object.freeze({
    mode: 'dark',
    label: 'Switch to dark theme',
    announcement: 'Dark theme',
    icon: MOON_STARS_FILL,
  }),
]);
