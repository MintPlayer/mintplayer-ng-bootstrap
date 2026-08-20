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
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

import {
  buildChromeModule,
  chromeArrayConstant,
  extractDsdTemplate,
  MAX_CHROME_COUNT,
} from './lib/chrome-module.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const { render } = await import('@lit-labs/ssr');
const { collectResult } = await import('@lit-labs/ssr/lib/render-result.js');
const { html } = await import('lit');
await import(
  pathToFileURL(resolve(repoRoot, 'dist/libs/mintplayer-web-components/carousel/index.mjs')).href
);

// Variant 0 doubles as the over-cap fallback: styled and visible (slides render
// through the default slot) but without the radio machine — honest Tier-2.
const MAX_COUNT = MAX_CHROME_COUNT;

const variants = [];
for (let n = 0; n <= MAX_COUNT; n++) {
  const full = await collectResult(render(html`<mp-carousel slide-count=${String(n)}></mp-carousel>`));
  const chrome = extractDsdTemplate(full);
  if (!chrome) {
    console.error(`gen-carousel-chrome: no DSD <template> for slide-count=${n}:\n`, full);
    process.exit(1);
  }
  variants.push(chrome);
}
console.log(
  `gen-carousel-chrome: ${variants.length} variants, ${variants[0].length}–${variants[MAX_COUNT].length} chars`,
);

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/carousel/ssr/mp-carousel-chrome.generated.ts',
);
const content = buildChromeModule({
  generator: 'gen-carousel-chrome.mjs',
  source: 'the mp-carousel Lit element rendered via @lit-labs/ssr at each slide count.',
  declarations: [
    chromeArrayConstant(
      'MP_CAROUSEL_DSD_CHROME_BY_COUNT',
      variants,
      'DSD chrome per slide count (index = count). Index 0 is the inert over-cap fallback.',
    ),
  ],
});
await writeFile(out, content, 'utf8');
console.log(`gen-carousel-chrome: wrote ${out}`);
