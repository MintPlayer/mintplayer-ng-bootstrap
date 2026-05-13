/**
 * Shared ng-package config builder for the secondary entry points of
 * @mintplayer/ng-bootstrap. Each `<entry>/ng-package.js` should simply do:
 *
 *   module.exports = require('<rel>/ng-package.secondary.cjs').secondaryEntry();
 *
 * Or pass per-entry overrides (e.g. `styleIncludePaths`):
 *
 *   module.exports = require('<rel>/ng-package.secondary.cjs').secondaryEntry({
 *     styleIncludePaths: ['src'],
 *   });
 *
 * The `silenceDeprecations` list below exists only because Bootstrap 5.3.x's
 * SCSS triggers Sass 3.0 deprecation warnings (`@import`, `mix()` and other
 * global builtins, `red()`/`green()`/`blue()`, `if()`, the legacy JS API).
 * Upstream's fix PR (twbs/bootstrap#41112) was closed without merging; the
 * cleanup only landed on v6-dev as part of a full rewrite (twbs/bootstrap#40849,
 * twbs/bootstrap#40962). Drop the entire `silenceDeprecations` array — here
 * AND in the umbrella `ng-package.json` lib.sass.silenceDeprecations, AND in
 * apps/ng-bootstrap-demo/project.json stylePreprocessorOptions.sass, AND in
 * tools/scripts/build-web-components.mjs — when bumping the bootstrap peer
 * dep to v6.
 */

const BOOTSTRAP_SILENCED_DEPRECATIONS = [
  'import',
  'global-builtin',
  'color-functions',
  'if-function',
  'legacy-js-api',
];

function secondaryEntry(extra = {}) {
  return {
    lib: {
      entryFile: 'index.ts',
      sass: { silenceDeprecations: BOOTSTRAP_SILENCED_DEPRECATIONS },
      ...extra,
    },
  };
}

module.exports = { secondaryEntry, BOOTSTRAP_SILENCED_DEPRECATIONS };
