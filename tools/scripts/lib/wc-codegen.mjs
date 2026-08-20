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

/** Returns true iff it actually wrote. Byte-identical output is left alone so
 *  the Nx cache stays warm and git stays clean. */
export async function writeIfChanged(outPath, next) {
  let prev = null;
  if (existsSync(outPath)) prev = await readFile(outPath, 'utf8');
  if (prev === next) return false;
  await writeFile(outPath, next, 'utf8');
  return true;
}
