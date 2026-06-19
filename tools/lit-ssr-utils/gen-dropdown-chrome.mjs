// Renders an empty <mp-dropdown> (the built WC) via @lit-labs/ssr and writes its
// static Declarative Shadow DOM chrome to a generated TS constant. The SSR
// servers inject that constant after each <mp-dropdown> tag so the dropdown
// renders/toggles (native <details>) with JavaScript disabled.
//
//   nx run mintplayer-web-components:codegen-dropdown-chrome   (preferred — owns
//                                                              the build dep)
//   node tools/lit-ssr-utils/gen-dropdown-chrome.mjs           (direct; needs a
//                                                              prior WC build)
//
// The dropdown's shadow is static chrome (a <details> + <summary> + menu with
// named/default slots + inlined styles); the consumer's trigger + items are
// slotted light DOM, so this is a constant insertion like mp-shell — not a
// per-instance render (contrast the carousel, whose DSD varies by slide count).
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const { render } = await import('@lit-labs/ssr');
const { collectResult } = await import('@lit-labs/ssr/lib/render-result.js');
const { html } = await import('lit');
await import(pathToFileURL(resolve(repoRoot, 'dist/libs/mintplayer-web-components/dropdown/index.mjs')).href);

const full = await collectResult(render(html`<mp-dropdown></mp-dropdown>`));
const match = full.match(/<template[^>]*shadowrootmode[^>]*>[\s\S]*?<\/template>/);
if (!match) {
  console.error('gen-dropdown-chrome: no DSD <template> in render output:\n', full);
  process.exit(1);
}

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/dropdown/ssr/mp-dropdown-chrome.generated.ts',
);
const content = `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node tools/lit-ssr-utils/gen-dropdown-chrome.mjs
// Source: the <mp-dropdown> Lit element rendered via @lit-labs/ssr.

export const MP_DROPDOWN_DSD_CHROME = ${JSON.stringify(match[0])};
`;
await writeFile(out, content, 'utf8');
console.log(`gen-dropdown-chrome: wrote ${out} (${match[0].length} chars)`);
