// Renders an empty <mp-shell> (the built WC) via @lit-labs/ssr and writes its
// static Declarative Shadow DOM chrome to a generated TS constant. The SSR
// servers inject that constant after each <mp-shell> tag so the component
// renders/toggles with JavaScript disabled.
//
//   nx run mintplayer-web-components:codegen-shell-chrome   (preferred — owns
//                                                            the build dep)
//   node tools/lit-ssr-utils/gen-shell-chrome.mjs            (direct; needs a
//                                                            prior WC build)
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
await import(pathToFileURL(resolve(repoRoot, 'dist/libs/mintplayer-web-components/shell/index.mjs')).href);

const full = await collectResult(render(html`<mp-shell></mp-shell>`));
const chrome = extractDsdTemplate(full);
if (!chrome) {
  console.error('gen-shell-chrome: no DSD <template> in render output:\n', full);
  process.exit(1);
}

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/shell/ssr/mp-shell-chrome.generated.ts',
);
const content = buildChromeModule({
  generator: 'gen-shell-chrome.mjs',
  source: 'the <mp-shell> Lit element rendered via @lit-labs/ssr.',
  declarations: [chromeConstant('MP_SHELL_DSD_CHROME', chrome)],
});
await writeFile(out, content, 'utf8');
console.log(`gen-shell-chrome: wrote ${out} (${chrome.length} chars)`);
