// Renders the built <mp-accordion> via @lit-labs/ssr and writes its Declarative
// Shadow DOM chrome to a generated TS file — one variant per (multi, tab-count)
// pair. The chrome is count-DEPENDENT (N inputs / headers / collapses, N slot
// pairs) and mode-DEPENDENT (radio when single-open, checkbox under multi), so
// a single constant can't serve every instance. Rendering the element itself at
// each combination keeps render() the single source of truth; the injector
// counts an instance's <mp-accordion-tab> children, reads `multi` off the tag
// and picks the matching variant.
//
//   nx run mintplayer-web-components:codegen-accordion-chrome   (preferred)
//   node tools/lit-ssr-utils/gen-accordion-chrome.mjs           (needs a prior WC build)
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const { render } = await import('@lit-labs/ssr');
const { collectResult } = await import('@lit-labs/ssr/lib/render-result.js');
const { html } = await import('lit');
await import(
  pathToFileURL(resolve(repoRoot, 'dist/libs/mintplayer-web-components/accordion/index.mjs')).href
);

// Variant 0 doubles as the over-cap fallback: styled and visible (children
// render through the default slot) but without the input machine — honest
// Tier-2 — and is also the genuine chrome for a tab-less accordion used as a
// plain styled container.
const MAX_COUNT = 12;

async function renderVariant(multi, count) {
  const full = await collectResult(
    render(
      multi
        ? html`<mp-accordion multi tab-count=${String(count)}></mp-accordion>`
        : html`<mp-accordion tab-count=${String(count)}></mp-accordion>`,
    ),
  );
  const match = full.match(/<template[^>]*shadowrootmode[^>]*>[\s\S]*?<\/template>/);
  if (!match) {
    console.error(
      `gen-accordion-chrome: no DSD <template> for multi=${multi} tab-count=${count}:\n`,
      full,
    );
    process.exit(1);
  }
  return match[0];
}

const single = [];
const multi = [];
for (let n = 0; n <= MAX_COUNT; n++) {
  single.push(await renderVariant(false, n));
  multi.push(await renderVariant(true, n));
}
console.log(
  `gen-accordion-chrome: ${single.length + multi.length} variants, ` +
    `${single[0].length}–${multi[MAX_COUNT].length} chars`,
);

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/accordion/ssr/mp-accordion-chrome.generated.ts',
);
const content = `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node tools/lit-ssr-utils/gen-accordion-chrome.mjs
// Source: the mp-accordion Lit element rendered via @lit-labs/ssr at each tab count.

/** DSD chrome per tab count (index = count), single-open (radio) mode. */
export const MP_ACCORDION_DSD_CHROME_BY_COUNT: readonly string[] = ${JSON.stringify(single)};

/** DSD chrome per tab count (index = count), \`multi\` (checkbox) mode. */
export const MP_ACCORDION_MULTI_DSD_CHROME_BY_COUNT: readonly string[] = ${JSON.stringify(multi)};
`;
await writeFile(out, content, 'utf8');
console.log(`gen-accordion-chrome: wrote ${out}`);
