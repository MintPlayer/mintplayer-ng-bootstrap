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

// tag → constant name. Each element's chrome is static (independent of slotted
// content / per-instance attributes), so one constant per tag suffices.
const ELEMENTS = [
  { tag: 'mp-dropdown-menu', constant: 'MP_DROPDOWN_MENU_DSD_CHROME', tpl: html`<mp-dropdown-menu></mp-dropdown-menu>` },
  { tag: 'mp-dropdown-item', constant: 'MP_DROPDOWN_ITEM_DSD_CHROME', tpl: html`<mp-dropdown-item></mp-dropdown-item>` },
  { tag: 'mp-dropdown-divider', constant: 'MP_DROPDOWN_DIVIDER_DSD_CHROME', tpl: html`<mp-dropdown-divider></mp-dropdown-divider>` },
  { tag: 'mp-dropdown-header', constant: 'MP_DROPDOWN_HEADER_DSD_CHROME', tpl: html`<mp-dropdown-header></mp-dropdown-header>` },
];

const lines = [];
for (const { tag, constant, tpl } of ELEMENTS) {
  const full = await collectResult(render(tpl));
  const match = full.match(/<template[^>]*shadowrootmode[^>]*>[\s\S]*?<\/template>/);
  if (!match) {
    console.error(`gen-dropdown-chrome: no DSD <template> for <${tag}>:\n`, full);
    process.exit(1);
  }
  lines.push(`export const ${constant} = ${JSON.stringify(match[0])};`);
  console.log(`gen-dropdown-chrome: <${tag}> chrome ${match[0].length} chars`);
}

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/dropdown-menu/ssr/mp-dropdown-chrome.generated.ts',
);
const content = `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node tools/lit-ssr-utils/gen-dropdown-chrome.mjs
// Source: the dropdown Lit elements rendered via @lit-labs/ssr.

${lines.join('\n')}
`;
await writeFile(out, content, 'utf8');
console.log(`gen-dropdown-chrome: wrote ${out}`);
