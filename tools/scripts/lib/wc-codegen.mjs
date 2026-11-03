/**
 * Pure helpers behind the web-component codegen.
 *
 * Extracted from build-web-components.mjs so they can be tested: that script
 * validates its argv and calls process.exit(1) at module scope, so importing it
 * from a spec would kill the test runner.
 *
 * Everything here is a pure string transform except writeIfChanged, which is the
 * idempotence guarantee the Nx cache depends on and is worth testing directly.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Escape a string for interpolation into a JS template literal.
 *
 * The three replaces are ORDER-DEPENDENT: backslashes must double first, or the
 * escapes introduced by the later two get themselves escaped. This function sits
 * under every generated file in the workspace, so a reordering here corrupts the
 * inputs to everything downstream — silently, since the output still parses.
 */
export function escapeForTemplateLiteral(input) {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

/** `mp-code-snippet` -> `mpCodeSnippet`. Digits count as word starts too. */
export function toCamelCase(kebab) {
  return kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function buildElementTemplateModule({ css, html, sourceHtmlRel, sourceScssRel }) {
  return [
    '// AUTO-GENERATED — do not edit by hand.',
    `// Source: ${sourceHtmlRel} + ${sourceScssRel}`,
    '// Regenerate with the codegen-wc Nx target.',
    '',
    "import { html, unsafeCSS } from 'lit';",
    '',
    `export const template = html\`${escapeForTemplateLiteral(html)}\`;`,
    `export const styles = unsafeCSS(\`${escapeForTemplateLiteral(css)}\`);`,
    '',
  ].join('\n');
}

export function buildStylesModule({ css, sourceScssRel, exportName }) {
  return [
    '// AUTO-GENERATED — do not edit by hand.',
    `// Source: ${sourceScssRel}`,
    '// Regenerate with the codegen-wc Nx target.',
    '',
    "import { unsafeCSS } from 'lit';",
    '',
    `export const ${exportName} = unsafeCSS(\`${escapeForTemplateLiteral(css)}\`);`,
    `export default ${exportName};`,
    '',
  ].join('\n');
}

/**
 * Lit-free variant for @mintplayer/ui-core: the sheet as a plain string, so a
 * front that never loads lit (Angular, React, Vue) can install it through the
 * scoped-styles registry.
 */
export function buildPlainStylesModule({ css, sourceScssRel, exportName }) {
  return [
    '// AUTO-GENERATED — do not edit by hand.',
    `// Source: ${sourceScssRel}`,
    '// Regenerate with the codegen Nx target of the owning library.',
    '',
    `export const ${exportName} = \`${escapeForTemplateLiteral(css)}\`;`,
    `export default ${exportName};`,
    '',
  ].join('\n');
}

/**
 * A Bootstrap part module (#452): the scoped and the verbatim (`…Page`)
 * variant of one partial, as two named string exports. No default export, so
 * a bundler drops whichever variant nobody imports.
 */
export function buildBootstrapPartModule({ scoped, page, sourceScssRel, scopedName, pageName }) {
  return [
    '// AUTO-GENERATED — do not edit by hand.',
    `// Source: ${sourceScssRel}`,
    '// Regenerate with the codegen Nx target of the owning library.',
    '',
    `export const ${scopedName} = \`${escapeForTemplateLiteral(scoped)}\`;`,
    '',
    `export const ${pageName} = \`${escapeForTemplateLiteral(page)}\`;`,
    '',
  ].join('\n');
}

/**
 * The cascade-layer order every page-level sheet declares first (PRD #437 C1).
 * Repeated at the top of each component sheet, so it does not matter whether
 * the baseline or a component sheet reaches the page first: the first order
 * statement fixes the order, and an identical one later is a no-op.
 */
export const LAYER_ORDER = '@layer mp.bootstrap, mp.components;';

/**
 * Put a compiled component sheet in `@layer mp.components`, after the order
 * statement. A leading `@charset` (Sass emits one for non-ASCII output) must
 * stay the very first rule, so it is hoisted above the order statement.
 */
export function wrapInComponentsLayer(css) {
  return wrapInLayer(css, 'mp.components');
}

/**
 * The sublayers of `mp.bootstrap` (#452). The page baseline and the
 * per-component part sheets are separate sheets that reach the page in any
 * order, while Bootstrap relies on stock source order between them:
 *
 * - base (root/reboot/type/images) comes first, helpers and the utility API
 *   last (`.fixed-top` must beat `.navbar`'s `position: relative`); those three
 *   get sublayers of their own;
 * - every component partial, and the buttons of the baseline, share ONE layer,
 *   `components`. Bootstrap's cross-partial overrides are specificity-based and
 *   often point backwards (`.card > .list-group` lives in card, BEFORE
 *   list-group; `.navbar-expand .offcanvas` in navbar, before offcanvas). A
 *   layer per partial let the later layer win regardless of specificity and
 *   broke ~100 of them (measured); one shared layer lets specificity decide
 *   again. The equal-specificity ties between partials (`.card-header-tabs`
 *   over `.nav-tabs`) are kept by the registry, which inserts part sheets in
 *   BOOTSTRAP_PARTIAL_ORDER whatever the install order.
 *
 * The baseline (ui-core/styles/bootstrap.scss) repeats the order statement
 * verbatim; bootstrap-baseline-superset.spec.ts holds the two together.
 */
export const BOOTSTRAP_SUBLAYERS = ['base', 'components', 'helpers', 'utilities'];

/** The component partials (and the baseline's buttons) in stock bootstrap.scss
 *  import order: the order the registry keeps between part sheets. */
export const BOOTSTRAP_PARTIAL_ORDER = [
  'containers', 'grid', 'tables', 'forms', 'buttons', 'transitions', 'dropdown', 'button-group',
  'nav', 'navbar', 'card', 'accordion', 'breadcrumb', 'pagination', 'badge', 'alert', 'progress',
  'list-group', 'close', 'toasts', 'modal', 'tooltip', 'popover', 'carousel', 'spinners', 'offcanvas',
  'placeholders',
];

/** The order statement every Bootstrap part sheet starts with. */
export const BOOTSTRAP_LAYER_ORDER = `@layer ${BOOTSTRAP_SUBLAYERS.map((name) => `mp.bootstrap.${name}`).join(', ')};`;

/** Put compiled CSS in the named `mp.*` layer, after the order statement (a
 *  leading `@charset` must stay first). A `mp.bootstrap.*` sublayer also gets
 *  the sublayer order. */
export function wrapInLayer(css, layer) {
  const charset = /^@charset "[^"]*";\s*/.exec(css);
  const body = (charset ? css.slice(charset[0].length) : css).trim();
  const order = layer.startsWith('mp.bootstrap.') ? `${LAYER_ORDER}\n${BOOTSTRAP_LAYER_ORDER}` : LAYER_ORDER;
  return `${charset ? charset[0].trim() + '\n' : ''}${order}\n@layer ${layer} {\n${body}\n}`;
}

/** Returns true iff it actually wrote. Byte-identical output is left alone so
 *  the Nx cache stays warm and git stays clean. */
export async function writeIfChanged(outPath, next) {
  let prev = null;
  if (existsSync(outPath)) prev = await readFile(outPath, 'utf8');
  if (prev === next) return false;
  await writeFile(outPath, next, 'utf8');
  return true;
}
