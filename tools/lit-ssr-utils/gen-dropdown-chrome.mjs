// Renders each empty dropdown WC (the built elements) via @lit-labs/ssr and
// writes their static Declarative Shadow DOM chrome to a generated TS file. The
// SSR servers inject those constants after each matching tag so the dropdown
// renders with JavaScript disabled.
//
//   nx run mintplayer-web-components:codegen-dropdown-chrome   (preferred — owns
//                                                              the build dep)
//   node tools/lit-ssr-utils/gen-dropdown-chrome.mjs           (direct; needs a
//                                                              prior WC build)
//
// Reads the built dist element, so the Nx target dependsOn the WC `build`.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

import { buildChromeModule, chromeConstant, extractDsdTemplate } from './lib/chrome-module.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const { render } = await import('@lit-labs/ssr');
const { collectResult } = await import('@lit-labs/ssr/lib/render-result.js');
const { html } = await import('lit');
await import(
  pathToFileURL(
    resolve(repoRoot, 'dist/libs/mintplayer-web-components/dropdown-menu/index.mjs'),
  ).href
);

// Only `<mp-dropdown-menu>` has a shadow root / DSD chrome. Items, dividers and
// headers are plain light-DOM elements (Bootstrap-classed via attribute
// directives) styled by the menu's `::slotted(...)` rules + a companion
// light-DOM sheet — they have no shadow, so no chrome to inject.
const ELEMENTS = [
  { tag: 'mp-dropdown-menu', constant: 'MP_DROPDOWN_MENU_DSD_CHROME', tpl: html`<mp-dropdown-menu></mp-dropdown-menu>` },
];

const lines = [];
for (const { tag, constant, tpl } of ELEMENTS) {
  const full = await collectResult(render(tpl));
  const chrome = extractDsdTemplate(full);
  if (!chrome) {
    console.error(`gen-dropdown-chrome: no DSD <template> for <${tag}>:\n`, full);
    process.exit(1);
  }
  lines.push(chromeConstant(constant, chrome));
  console.log(`gen-dropdown-chrome: <${tag}> chrome ${chrome.length} chars`);
}

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/dropdown-menu/ssr/mp-dropdown-chrome.generated.ts',
);
const content = buildChromeModule({
  generator: 'gen-dropdown-chrome.mjs',
  source: 'the dropdown Lit elements rendered via @lit-labs/ssr.',
  declarations: lines,
});
await writeFile(out, content, 'utf8');
console.log(`gen-dropdown-chrome: wrote ${out}`);
