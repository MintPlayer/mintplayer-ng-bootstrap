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
import { writeFile } from 'node:fs/promises';

import { runCli } from '../scripts/lib/cli.mjs';
import {
  chromeConstant,
  chromeOutPath,
  distEntryUrl,
  dsdChromeOf,
  REPO_ROOT,
  runChromeGenerator,
} from './lib/chrome-module.mjs';
import { createLitRenderer } from './lib/lit-renderer.mjs';

/** @param {import('./lib/chrome-module.mjs').GeneratorOptions} [options] */
export async function main({
  repoRoot = REPO_ROOT,
  renderer,
  write = writeFile,
  log = console.log,
  error = console.error,
} = {}) {
  const { html, render } =
    renderer ?? (await createLitRenderer([distEntryUrl(repoRoot, 'shell')]));

  return runChromeGenerator({
    generator: 'gen-shell-chrome',
    source: 'the <mp-shell> Lit element rendered via @lit-labs/ssr.',
    out: chromeOutPath(repoRoot, 'shell', 'mp-shell-chrome.generated.ts'),
    write,
    log,
    error,
    build: async () => {
      const chrome = await dsdChromeOf({ render })(html`<mp-shell></mp-shell>`, '<mp-shell>');
      return {
        declarations: [chromeConstant('MP_SHELL_DSD_CHROME', chrome)],
        note: ` (${chrome.length} chars)`,
      };
    },
  });
}

runCli(import.meta.url, main);
