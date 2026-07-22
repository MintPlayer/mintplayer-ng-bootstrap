// Renders each empty navbar WC (the built elements) via @lit-labs/ssr and writes
// their static Declarative Shadow DOM chrome to a generated TS file. The SSR
// servers inject those constants after each matching tag so the navbar renders
// (and collapses/reveals via CSS) with JavaScript disabled.
//
//   nx run mintplayer-web-components:codegen-navbar-chrome   (preferred)
//   node tools/lit-ssr-utils/gen-navbar-chrome.mjs           (needs a prior WC build)
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
  pathToFileURL(resolve(repoRoot, 'dist/libs/mintplayer-web-components/navbar/index.mjs')).href
);

const ELEMENTS = [
  { tag: 'mp-navbar', constant: 'MP_NAVBAR_DSD_CHROME', tpl: html`<mp-navbar></mp-navbar>` },
  { tag: 'mp-navbar-item', constant: 'MP_NAVBAR_ITEM_DSD_CHROME', tpl: html`<mp-navbar-item></mp-navbar-item>` },
  { tag: 'mp-navbar-brand', constant: 'MP_NAVBAR_BRAND_DSD_CHROME', tpl: html`<mp-navbar-brand></mp-navbar-brand>` },
  { tag: 'mp-navbar-dropdown', constant: 'MP_NAVBAR_DROPDOWN_DSD_CHROME', tpl: html`<mp-navbar-dropdown></mp-navbar-dropdown>` },
];

const lines = [];
for (const { tag, constant, tpl } of ELEMENTS) {
  const full = await collectResult(render(tpl));
  const match = full.match(/<template[^>]*shadowrootmode[^>]*>[\s\S]*?<\/template>/);
  if (!match) {
    console.error(`gen-navbar-chrome: no DSD <template> for <${tag}>:\n`, full);
    process.exit(1);
  }
  lines.push(`export const ${constant} = ${JSON.stringify(match[0])};`);
  console.log(`gen-navbar-chrome: <${tag}> chrome ${match[0].length} chars`);
}

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/navbar/ssr/mp-navbar-chrome.generated.ts',
);
const content = `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node tools/lit-ssr-utils/gen-navbar-chrome.mjs
// Source: the navbar Lit elements rendered via @lit-labs/ssr.

${lines.join('\n')}
`;
await writeFile(out, content, 'utf8');
console.log(`gen-navbar-chrome: wrote ${out}`);
