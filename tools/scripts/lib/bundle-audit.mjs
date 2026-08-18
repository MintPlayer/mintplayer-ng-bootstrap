/**
 * Pure analysis behind the two built-artifact guards
 * (check-code-snippet-hljs-lazy.mjs, check-ribbon-bundle-size.mjs).
 *
 * Those scripts read `dist/`, so they can only run after a build and stay CLI
 * rituals. What is testable is the judgement they make about what they read —
 * which is all of it, and it lives here.
 */

/** Static ESM imports: `import … from 'x'`, `import 'x'`, `export … from 'x'`. */
export function staticSpecifiersOf(source) {
  return [
    ...source.matchAll(/(?:^|[;\s}])(?:import|export)\s*(?:[^'"()]*?\bfrom\s*)?['"]([^'"]+)['"]/g),
  ].map((m) => m[1]);
}

/** Dynamic imports: `import('x')`. */
export function dynamicSpecifiersOf(source) {
  return [...source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
}

const isHljs = (s) => s === 'highlight.js' || s.startsWith('highlight.js/');

/**
 * The one guarantee that makes `<mp-code-snippet>` cheap: highlight.js grammars
 * are loaded on demand, never eagerly.
 *
 * Size is the wrong instrument here — hljs is `external` in the WC build, so a
 * regression to `import hljs from 'highlight.js/lib/common'` adds a ~60-byte
 * bare specifier and sails under any budget while costing every consumer 53.7 KB
 * gzip in THEIR bundle. Import SHAPE is the thing to assert:
 *
 *   - `highlight.js/lib/core` may be imported statically (needed to highlight
 *     anything at all).
 *   - `highlight.js/lib/common` and `.../languages/*` only inside `import(...)`.
 *   - Bare `highlight.js` (the full library) may not appear at all.
 *
 * Returns `{ staticHljs, dynamicHljs, failures }`. Empty `failures` means the
 * guarantee holds.
 */
export function auditHljsImports(source) {
  const staticHljs = staticSpecifiersOf(source).filter(isHljs);
  const dynamicHljs = dynamicSpecifiersOf(source).filter(isHljs);
  const failures = [];

  for (const spec of staticHljs) {
    if (spec === 'highlight.js/lib/core') continue;
    failures.push(
      `static import of "${spec}" — grammars must be loaded through the generated ` +
        'loader map (hljs-loaders.generated.ts), not imported at module top level.',
    );
  }

  for (const spec of dynamicHljs) {
    if (spec === 'highlight.js') {
      failures.push(
        'dynamic import of the FULL "highlight.js" library (314 KB gzip) — ' +
          'import "highlight.js/lib/common" for auto-detect instead.',
      );
    }
  }

  // A build with no dynamic hljs import at all means the loader map was dropped
  // or inlined — the guarantee is gone even though no rule above fired.
  if (dynamicHljs.length === 0) {
    failures.push(
      'no dynamic highlight.js import found. The generated loader map is ' +
        'missing from the build, so no grammar can be loaded on demand.',
    );
  }

  return { staticHljs, dynamicHljs, failures };
}

/** `--max 25000` from argv, falling back to the caller's default. */
export function parseMaxBytes(args, fallback) {
  const index = args.indexOf('--max');
  if (index < 0) return fallback;
  const parsed = Number(args[index + 1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
