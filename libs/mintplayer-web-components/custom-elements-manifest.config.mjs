/**
 * Custom Elements Manifest config for @mintplayer/web-components.
 *
 * Produces `custom-elements.json` at the lib root describing every WC's
 * public API (tag, attributes, properties, events, slots, CSS parts).
 * Consumed by Vue Volar, VS Code's Lit plugin, future Storybook docs,
 * and any raw-HTML consumer with an editor that respects the
 * `"customElements"` field in package.json.
 *
 * Run via the `cem` Nx target, which is a build prerequisite. Output is
 * checked into source-control intentionally so consumers of the published
 * package always get the manifest matching the version they install.
 */
export default {
  globs: ['**/*.element.ts', '*/src/**/*.ts'],
  exclude: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.element.template.ts',
    '**/node_modules/**',
    'dist/**',
    'src/lib/**', // generator's placeholder source; remove once the primary entry settles.
  ],
  outdir: '.',
  litelement: true,
  dev: false,
  watch: false,
};
