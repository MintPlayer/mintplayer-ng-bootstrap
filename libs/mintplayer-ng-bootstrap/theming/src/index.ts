// The framework-neutral core, re-exported BY NAME so Angular consumers need one
// import without inheriting store internals. Deliberately not re-exported:
// getBsThemeStore / configureBsTheme (browser-only; use BsThemeService and
// provideBsTheme, which are SSR-safe), writeThemeCookie (the store owns writes),
// and __resetBsThemeStoreForTests.
export {
  BS_THEME_COOKIE_NAME,
  BS_THEME_DEFAULT_MODE_META,
  BS_THEME_DEFAULT_MODES,
  injectThemeAttribute,
  isValidThemeMode,
  readDefaultModeMeta,
  readThemeCookie,
  resolveMode,
  resolveServerTheme,
} from '@mintplayer/ui-core/theming';
export type {
  BsEffectiveThemeMode,
  BsThemeConfig,
  BsThemeMode,
  BsThemeToggleMode,
  ResolveServerThemeOptions,
} from '@mintplayer/ui-core/theming';
export * from './lib/service/bs-theme.service';
export * from './lib/provide-bs-theme';
export * from './generated';
