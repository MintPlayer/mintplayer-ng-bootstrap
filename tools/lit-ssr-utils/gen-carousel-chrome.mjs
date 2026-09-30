// Renders the built <mp-carousel> via @lit-labs/ssr and writes its Declarative
// Shadow DOM chrome to a generated TS file — one variant per slide count. The
// carousel's chrome is count-DEPENDENT (N radios, N indicator labels, N
// prev/next label pairs, per-index :checked CSS), so unlike navbar/shell a
// single constant can't serve every instance. Rendering the element at each
// count keeps render() the single source of truth; the injector counts an
// instance's light-DOM children and picks the matching variant.
//
//   nx run mintplayer-web-components:codegen-carousel-chrome   (preferred)
//   node tools/lit-ssr-utils/gen-carousel-chrome.mjs           (needs a prior WC build)
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

const GENERATOR = 'gen-carousel-chrome';

// Index 0 is the inert over-cap fallback (see MAX_CHROME_COUNT).
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
    renderer ?? (await createLitRenderer([distEntryUrl(repoRoot, 'carousel')]));
  const chromeOf = dsdChromeOf({ render });

  return runChromeGenerator({
    generator: GENERATOR,
    source: 'the mp-carousel Lit element rendered via @lit-labs/ssr at each slide count.',
    out: chromeOutPath(repoRoot, 'carousel', 'mp-carousel-chrome.generated.ts'),
    write,
    log,
    error,
    build: async () => {
      const variants = await mapSequential(COUNTS, (n) =>
        chromeOf(html`<mp-carousel slide-count=${String(n)}></mp-carousel>`, `slide-count=${n}`),
      );
      log(
        `${GENERATOR}: ${variants.length} variants, ` +
          `${variants[0].length}–${variants[MAX_CHROME_COUNT].length} chars`,
      );
      return {
        declarations: [
          chromeArrayConstant(
            'MP_CAROUSEL_DSD_CHROME_BY_COUNT',
            variants,
            'DSD chrome per slide count (index = count). Index 0 is the inert over-cap fallback.',
          ),
        ],
      };
    },
  });
}

runCli(import.meta.url, main);
