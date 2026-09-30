// Renders each empty navbar WC (the built elements) via @lit-labs/ssr and writes
// their static Declarative Shadow DOM chrome to a generated TS file. The SSR
// servers inject those constants after each matching tag so the navbar renders
// (and collapses/reveals via CSS) with JavaScript disabled.
//
//   nx run mintplayer-web-components:codegen-navbar-chrome   (preferred)
//   node tools/lit-ssr-utils/gen-navbar-chrome.mjs           (needs a prior WC build)
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

const GENERATOR = 'gen-navbar-chrome';

/** @param {import('./lib/chrome-module.mjs').GeneratorOptions} [options] */
export async function main({
  repoRoot = REPO_ROOT,
  renderer,
  write = writeFile,
  log = console.log,
  error = console.error,
} = {}) {
  const { html, render } =
    renderer ?? (await createLitRenderer([distEntryUrl(repoRoot, 'navbar')]));

  return runChromeGenerator({
    generator: GENERATOR,
    source: 'the navbar Lit elements rendered via @lit-labs/ssr.',
    out: chromeOutPath(repoRoot, 'navbar', 'mp-navbar-chrome.generated.ts'),
    write,
    log,
    error,
    build: async () => ({
      declarations: await staticChromeConstants({
        generator: GENERATOR,
        chromeOf: dsdChromeOf({ render }),
        log,
        elements: [
          { tag: 'mp-navbar', constant: 'MP_NAVBAR_DSD_CHROME', template: html`<mp-navbar></mp-navbar>` },
          {
            tag: 'mp-navbar-item',
            constant: 'MP_NAVBAR_ITEM_DSD_CHROME',
            template: html`<mp-navbar-item></mp-navbar-item>`,
          },
          {
            tag: 'mp-navbar-brand',
            constant: 'MP_NAVBAR_BRAND_DSD_CHROME',
            template: html`<mp-navbar-brand></mp-navbar-brand>`,
          },
          {
            tag: 'mp-navbar-dropdown',
            constant: 'MP_NAVBAR_DROPDOWN_DSD_CHROME',
            template: html`<mp-navbar-dropdown></mp-navbar-dropdown>`,
          },
        ],
      }),
    }),
  });
}

runCli(import.meta.url, main);
