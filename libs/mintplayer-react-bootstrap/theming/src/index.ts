export { useBsTheme, type UseBsThemeResult } from './useBsTheme';
export * from './generated';

/* The framework-neutral core, re-exported so a React consumer needs one import.
   The test-only store reset is
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
} from '@mintplayer/ui-core/theming';
