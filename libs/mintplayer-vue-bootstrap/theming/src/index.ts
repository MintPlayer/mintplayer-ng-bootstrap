export { default as BsThemeToggle } from './BsThemeToggle.vue';
export { useBsTheme, type UseBsThemeResult } from './useBsTheme';

/* The framework-neutral core, re-exported so a Vue consumer needs one import.
   `MpThemeToggle` (use `BsThemeToggle`) and the test-only store reset are
   deliberately left out. */
export {
  BS_THEME_COOKIE_NAME,
  BS_THEME_DEFAULT_MODE_META,
  BS_THEME_DEFAULT_MODES,
  configureBsTheme,
  getBsThemeStore,
  injectThemeAttribute,
  isValidThemeMode,
  readDefaultModeMeta,
  readThemeCookie,
  resolveMode,
  resolveServerTheme,
  writeThemeCookie,
  type BsEffectiveThemeMode,
  type BsThemeConfig,
  type BsThemeMode,
  type BsThemeStore,
  type BsThemeToggleMode,
  type ResolveServerThemeOptions,
  type WriteThemeCookieOptions,
} from '@mintplayer/web-components/theming';
