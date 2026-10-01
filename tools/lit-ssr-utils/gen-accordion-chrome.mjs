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
import { writeFile } from 'node:fs/promises';

import { runCli } from '../scripts/lib/cli.mjs';
import {
  chromeArrayConstant,
  chromeOutPath,
  distEntryUrl,
  dsdChromeOf,
  mapSequential,
  MAX_CHROME_COUNT,
  REPO_ROOT,
  runChromeGenerator,
} from './lib/chrome-module.mjs';
import { createLitRenderer } from './lib/lit-renderer.mjs';

const GENERATOR = 'gen-accordion-chrome';

// Variant 0 doubles as the over-cap fallback: styled and visible (children
// render through the default slot) but without the input machine — honest
// Tier-2 — and is also the genuine chrome for a tab-less accordion used as a
// plain styled container.
const COUNTS = Array.from({ length: MAX_CHROME_COUNT + 1 }, (_, n) => n);

/** @param {import('./lib/chrome-module.mjs').GeneratorOptions} [options] */
export async function main({
  repoRoot = REPO_ROOT,
  renderer,
  write = writeFile,
  log = console.log,
  error = console.error,
} = {}) {
  const { html, render } =
    renderer ?? (await createLitRenderer([distEntryUrl(repoRoot, 'accordion')]));
  const chromeOf = dsdChromeOf({ render });
  const variant = (multi) => (count) =>
    chromeOf(
      multi
        ? html`<mp-accordion multi tab-count=${String(count)}></mp-accordion>`
        : html`<mp-accordion tab-count=${String(count)}></mp-accordion>`,
      `multi=${multi} tab-count=${count}`,
    );

  return runChromeGenerator({
    generator: GENERATOR,
    source: 'the mp-accordion Lit element rendered via @lit-labs/ssr at each tab count.',
    out: chromeOutPath(repoRoot, 'accordion', 'mp-accordion-chrome.generated.ts'),
    write,
    log,
    error,
    build: async () => {
      const single = await mapSequential(COUNTS, variant(false));
      const multi = await mapSequential(COUNTS, variant(true));
      log(
        `${GENERATOR}: ${single.length + multi.length} variants, ` +
          `${single[0].length}–${multi[MAX_CHROME_COUNT].length} chars`,
      );
      return {
        declarations: [
          chromeArrayConstant(
            'MP_ACCORDION_DSD_CHROME_BY_COUNT',
            single,
            'DSD chrome per tab count (index = count), single-open (radio) mode.',
          ),
          '',
          chromeArrayConstant(
            'MP_ACCORDION_MULTI_DSD_CHROME_BY_COUNT',
            multi,
            'DSD chrome per tab count (index = count), `multi` (checkbox) mode.',
          ),
        ],
      };
    },
  });
}

runCli(import.meta.url, main);
