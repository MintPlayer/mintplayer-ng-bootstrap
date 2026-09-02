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
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

import { buildChromeModule } from './lib/chrome-module.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const distEntry = (name) =>
  pathToFileURL(resolve(repoRoot, `dist/libs/mintplayer-web-components/${name}/index.mjs`)).href;

// [tag, scope key, dist entry, exported CSSResult]. The scope key must match the
// `installLightStyles('<key>', …)` call in the element, or the client would
// install a second copy of the sheet instead of adopting the SSR one.
const COMPONENTS = [
  ['mp-datatable', 'datatable', 'datatable', 'datatableLightStyles'],
  ['mp-treeview', 'treeview', 'treeview', 'treeviewLightStyles'],
  ['mp-tree-select', 'tree-select', 'tree-select', 'treeSelectLightStyles'],
  ['mp-query-builder', 'query-builder', 'query-builder', 'queryBuilderLightStyles'],
  ['mp-query-condition', 'query-condition', 'query-builder', 'queryConditionLightStyles'],
  ['mp-query-group', 'query-group', 'query-builder', 'queryGroupLightStyles'],
  ['mp-query-subquery', 'query-subquery', 'query-builder', 'querySubqueryLightStyles'],
];

const rows = [];
for (const [tag, key, entry, exportName] of COMPONENTS) {
  const mod = await import(distEntry(entry));
  const styles = mod[exportName];
  if (!styles) {
    console.error(
      `gen-light-styles-chrome: ${entry} does not export ${exportName}. ` +
        `A light-tier component's sheet must be part of its public API.`,
    );
    process.exit(1);
  }
  const cssText = String(styles.cssText ?? styles);
  if (!cssText.trim()) {
    console.error(`gen-light-styles-chrome: ${exportName} is empty — codegen-wc has not run?`);
    process.exit(1);
  }
  // `</style>` cannot appear in the text or it would close the tag early. The
  // rescoper never emits one; assert rather than escape, so a future change
  // that could produce one fails loudly here.
  if (/<\/style/i.test(cssText)) {
    console.error(`gen-light-styles-chrome: ${exportName} contains a </style> sequence.`);
    process.exit(1);
  }
  rows.push([tag, key, `<style data-mp-light-styles="${key}">${cssText}</style>`]);
  console.log(`gen-light-styles-chrome: <${tag}> sheet ${cssText.length} chars`);
}

const out = resolve(
  repoRoot,
  'libs/mintplayer-web-components/light-dom/ssr/mp-light-styles-chrome.generated.ts',
);
const content = buildChromeModule({
  generator: 'gen-light-styles-chrome.mjs',
  source: "the light-tier components' rescoped stylesheets, read from the built dist.",
  declarations: [
    '/** `[tag, scope key, ready-to-insert <style> tag]` per light-tier component. */',
    `export const MP_LIGHT_STYLE_TAGS: readonly (readonly [string, string, string])[] = ${JSON.stringify(rows)};`,
  ],
});
await writeFile(out, content, 'utf8');
console.log(`gen-light-styles-chrome: wrote ${out}`);
