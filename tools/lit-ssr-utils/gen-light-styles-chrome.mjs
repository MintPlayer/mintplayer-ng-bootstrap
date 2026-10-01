// Emits the light-tier components' rescoped stylesheets as ready-to-insert
// `<style>` tags, so an SSR server can style them with JavaScript disabled.
//
//   nx run mintplayer-web-components:codegen-light-styles-chrome  (preferred —
//                                                                 owns the build dep)
//   node tools/lit-ssr-utils/gen-light-styles-chrome.mjs          (direct; needs a
//                                                                 prior WC build)
//
// Unlike the five DSD generators this renders nothing: a light-tier component
// has NO shadow root, so there is no Declarative Shadow DOM chrome to capture.
// Its styles live at document level, which is why the injector inserts them
// into `<head>` once per page rather than after each tag. What it shares with
// them is the shape — read the built dist, emit one generated TS module — and
// the reason for reading `dist`: the stylesheet is the codegen'd, RESCOPED CSS,
// so compiling the SCSS here would duplicate the rescoper and could drift from
// what the element actually ships.
//
// Its injected dependency is therefore not a renderer but `importDist(entry)`,
// the loader of a built entry's module namespace.
import { writeFile } from 'node:fs/promises';

import { runCli } from '../scripts/lib/cli.mjs';
import {
  ChromeGeneratorError,
  chromeOutPath,
  distEntryUrl,
  mapSequential,
  REPO_ROOT,
  runChromeGenerator,
} from './lib/chrome-module.mjs';

const GENERATOR = 'gen-light-styles-chrome';

// [tag, scope key, dist entry, exported CSSResult]. The scope key must match the
// `installLightStyles('<key>', …)` call in the element, or the client would
// install a second copy of the sheet instead of adopting the SSR one.
export const LIGHT_TIER_COMPONENTS = [
  ['mp-datatable', 'datatable', 'datatable', 'datatableLightStyles'],
  ['mp-treeview', 'treeview', 'treeview', 'treeviewLightStyles'],
  ['mp-tree-select', 'tree-select', 'tree-select', 'treeSelectLightStyles'],
  ['mp-query-builder', 'query-builder', 'query-builder', 'queryBuilderLightStyles'],
  ['mp-query-condition', 'query-condition', 'query-builder', 'queryConditionLightStyles'],
  ['mp-query-group', 'query-group', 'query-builder', 'queryGroupLightStyles'],
  ['mp-query-subquery', 'query-subquery', 'query-builder', 'querySubqueryLightStyles'],
];

/** The `<style>` tag for one component's sheet, or a reported failure. */
export function lightStyleTag(exportName, key, styles) {
  if (!styles) {
    throw new ChromeGeneratorError(
      `${exportName} is not exported. ` +
        `A light-tier component's sheet must be part of its public API.`,
    );
  }
  const cssText = String(styles.cssText ?? styles);
  if (!cssText.trim()) {
    throw new ChromeGeneratorError(`${exportName} is empty — codegen-wc has not run?`);
  }
  // `</style>` cannot appear in the text or it would close the tag early. The
  // rescoper never emits one; assert rather than escape, so a future change
  // that could produce one fails loudly here.
  if (/<\/style/i.test(cssText)) {
    throw new ChromeGeneratorError(`${exportName} contains a </style> sequence.`);
  }
  return { cssText, tag: `<style data-mp-light-styles="${key}">${cssText}</style>` };
}

/**
 * @param {Omit<import('./lib/chrome-module.mjs').GeneratorOptions, 'renderer'> & {
 *   importDist?: (entry: string) => Promise<Record<string, unknown>>,
 *   components?: string[][],
 * }} [options]
 */
export async function main({
  repoRoot = REPO_ROOT,
  importDist = (entry) => import(distEntryUrl(repoRoot, entry)),
  components = LIGHT_TIER_COMPONENTS,
  write = writeFile,
  log = console.log,
  error = console.error,
} = {}) {
  return runChromeGenerator({
    generator: GENERATOR,
    source: "the light-tier components' rescoped stylesheets, read from the built dist.",
    out: chromeOutPath(repoRoot, 'light-dom', 'mp-light-styles-chrome.generated.ts'),
    write,
    log,
    error,
    build: async () => {
      const rows = await mapSequential(components, async ([tag, key, entry, exportName]) => {
        const mod = await importDist(entry);
        const { cssText, tag: styleTag } = lightStyleTag(`${entry}'s ${exportName}`, key, mod[exportName]);
        log(`${GENERATOR}: <${tag}> sheet ${cssText.length} chars`);
        return [tag, key, styleTag];
      });
      return {
        declarations: [
          '/** `[tag, scope key, ready-to-insert <style> tag]` per light-tier component. */',
          `export const MP_LIGHT_STYLE_TAGS: readonly (readonly [string, string, string])[] = ${JSON.stringify(rows)};`,
        ],
      };
    },
  });
}

runCli(import.meta.url, main);
