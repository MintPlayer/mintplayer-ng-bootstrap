/**
 * The parts of a DSD-chrome generator that are not about rendering: pulling the
 * Declarative Shadow DOM template out of an SSR render, and emitting the
 * generated TypeScript module that holds it.
 *
 * Five generators (`gen-{accordion,carousel,dropdown,navbar,shell}-chrome.mjs`)
 * each carried their own copy of both. The copies could not be tested where
 * they were: every generator does a top-level `await import()` of a built
 * `dist/` bundle and installs a global DOM shim, so importing one from a spec
 * both requires a prior build and mutates globals process-wide. Lifting the
 * pure half out is what makes it reachable at all.
 *
 * This file is deliberately `.mjs` and deliberately inside `lit-ssr-utils/`:
 * `tools/vitest.config.ts` scopes `coverage.include` by extension AND
 * directory, so a `.ts` helper — or one placed elsewhere — would leave the
 * denominator, and coverage would rise while nothing new was tested.
 */

/**
 * The number of pre-rendered count variants a chrome table holds.
 *
 * Index 0 doubles as the over-cap fallback: styled and visible, with children
 * rendering through the default slot, but without the input machine. That is
 * honest Tier-2 — visible but inert — rather than a component that looks
 * interactive and is not.
 */
export const MAX_CHROME_COUNT = 12;

/** The DSD template in an SSR render, or null when the element produced no shadow root. */
export function extractDsdTemplate(rendered) {
  const match = String(rendered ?? '').match(
    /<template[^>]*shadowrootmode[^>]*>[\s\S]*?<\/template>/,
  );
  return match ? match[0] : null;
}

/** `export const NAME = "<chrome>";` */
export function chromeConstant(name, chrome, doc) {
  return `${docComment(doc)}export const ${name} = ${JSON.stringify(chrome)};`;
}

/**
 * `export const NAME: readonly string[] = [...];`
 *
 * The annotation is load-bearing: without it the emitted array widens to
 * `string[]` and a consumer can push into a table that is meant to be a
 * compile-time constant.
 */
export function chromeArrayConstant(name, chromes, doc) {
  return `${docComment(doc)}export const ${name}: readonly string[] = ${JSON.stringify(chromes)};`;
}

function docComment(doc) {
  return doc ? `/** ${doc} */\n` : '';
}

/**
 * The complete generated module: the do-not-edit header naming the command that
 * regenerates it, then the declarations.
 *
 * The header is the only thing standing between this file and someone editing a
 * generated artifact by hand, so `generator` is required rather than optional.
 */
export function buildChromeModule({ generator, source, declarations }) {
  return `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node tools/lit-ssr-utils/${generator}
// Source: ${source}

${declarations.join('\n')}
`;
}
