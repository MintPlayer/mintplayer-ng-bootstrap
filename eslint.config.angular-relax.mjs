// Shared lint relaxations for Angular projects, spread LAST in each project's
// eslint.config.mjs so it wins over the @angular-eslint recommended preset.
//
// Context: `nx lint` was never part of CI (only test/e2e/build), so enabling it
// during the ESLint 10 flat-config migration surfaced ~328 pre-existing, mostly
// intentional findings. To keep the Angular 22 dependency upgrade focused, we
// demote these rather than rename public selectors / API or do large refactors.
// They remain visible as warnings (or are disabled where compliance is impossible
// without a breaking rename). Tighten in a dedicated lint-cleanup pass.
export default [
  {
    files: ['**/*.ts'],
    rules: {
      // Selectors ship as public API — renaming them is breaking and explicitly
      // out of scope, so the prefix/type rules can't be satisfied in code.
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      // Aliased input/output names are part of the shipped public API.
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/no-output-native': 'off',
      // Migrating constructor DI to inject() is a separate refactor
      // (`ng generate @angular/core:inject`).
      '@angular-eslint/prefer-inject': 'warn',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      // Template a11y findings are tracked under the separate ARIA effort.
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/alt-text': 'warn',
      '@angular-eslint/template/prefer-control-flow': 'warn',
      '@angular-eslint/template/no-autofocus': 'warn',
    },
  },
];
