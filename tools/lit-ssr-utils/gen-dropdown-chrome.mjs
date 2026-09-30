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
import { writeFile } from 'node:fs/promises';

import { runCli } from '../scripts/lib/cli.mjs';
import {
  chromeOutPath,
  distEntryUrl,
  dsdChromeOf,
  REPO_ROOT,
  runChromeGenerator,
  staticChromeConstants,
} from './lib/chrome-module.mjs';
import { createLitRenderer } from './lib/lit-renderer.mjs';

const GENERATOR = 'gen-dropdown-chrome';

/** @param {import('./lib/chrome-module.mjs').GeneratorOptions} [options] */
export async function main({
  repoRoot = REPO_ROOT,
  renderer,
  write = writeFile,
  log = console.log,
  error = console.error,
} = {}) {
  const { html, render } =
    renderer ?? (await createLitRenderer([distEntryUrl(repoRoot, 'dropdown-menu')]));

  return runChromeGenerator({
    generator: GENERATOR,
    source: 'the dropdown Lit elements rendered via @lit-labs/ssr.',
    out: chromeOutPath(repoRoot, 'dropdown-menu', 'mp-dropdown-chrome.generated.ts'),
    write,
    log,
    error,
    build: async () => ({
      declarations: await staticChromeConstants({
        generator: GENERATOR,
        chromeOf: dsdChromeOf({ render }),
        log,
        elements: [
          {
            tag: 'mp-dropdown-menu',
            constant: 'MP_DROPDOWN_MENU_DSD_CHROME',
            template: html`<mp-dropdown-menu></mp-dropdown-menu>`,
          },
        ],
      }),
    }),
  });
}

runCli(import.meta.url, main);
