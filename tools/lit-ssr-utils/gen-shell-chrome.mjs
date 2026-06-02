// Renders an empty <mp-shell> (the built WC) via @lit-labs/ssr and writes its
// static Declarative Shadow DOM chrome to a generated TS constant. The SSR
// servers inject that constant after each <mp-shell> tag so the component
// renders/toggles with JavaScript disabled.
//
//   node tools/lit-ssr-utils/gen-shell-chrome.mjs
//
// Prereq: `nx build mintplayer-web-components` (reads the built dist element).
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const { render } = await import('@lit-labs/ssr');
const { collectResult } = await import('@lit-labs/ssr/lib/render-result.js');
const { html } = await import('lit');
await import(pathToFileURL(resolve(repoRoot, 'dist/libs/mintplayer-web-components/shell/index.mjs')).href);

const full = await collectResult(render(html`<mp-shell></mp-shell>`));
const match = full.match(/<template[^>]*shadowrootmode[^>]*>[\s\S]*?<\/template>/);
if (!match) {
  console.error('gen-shell-chrome: no DSD <template> in render output:\n', full);
  process.exit(1);
}

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/shell/ssr/mp-shell-chrome.generated.ts',
);
const content = `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node tools/lit-ssr-utils/gen-shell-chrome.mjs
// Source: the <mp-shell> Lit element rendered via @lit-labs/ssr.

export const MP_SHELL_DSD_CHROME = ${JSON.stringify(match[0])};
`;
await writeFile(out, content, 'utf8');
console.log(`gen-shell-chrome: wrote ${out} (${match[0].length} chars)`);
