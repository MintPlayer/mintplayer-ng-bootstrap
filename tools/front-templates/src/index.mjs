// @mintplayer/front-templates — compiles one Vue-syntax view template per
// component into the templates of up to four fronts (Angular, React, Vue, Lit),
// so a headless core's markup is written once (PRD #437, spike S13).
//
// The source is a Vue SFC (`<name>.view.vue`) so every IDE already type-checks
// it: `defineProps` / `defineSlots` with inline type literals, type-only imports
// by package path, `v-bind` attribute bags from the core's `connect()`. The
// rules it may use are listed in README.md next to this directory.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { readSource } from './source.mjs';
import { emitAngular } from './emit-angular.mjs';
import { emitReact } from './emit-react.mjs';
import { emitVue } from './emit-vue.mjs';
import { emitLit } from './emit-lit.mjs';

export { readSource, TemplateError, HOST_MARKER, GENERATOR } from './source.mjs';
export { emitAngular, emitReact, emitVue, emitLit };

/** Per front: the emitter, and the extension of what it writes. */
export const FRONTS = {
  angular: { ext: 'html', emit: (src, options) => emitAngular(src, options).text },
  react: { ext: 'tsx', emit: emitReact },
  vue: { ext: 'vue', emit: emitVue },
  lit: { ext: 'ts', emit: emitLit },
};

/**
 * Identity, for a typed config file:
 *
 *     export default defineConfig({
 *       root: 'libs/my-core',              // <root>/<entry>/<templates>/*.view.vue
 *       fronts: {
 *         react: { outDir: (entry) => `libs/my-react/${entry}/src/generated`, runtime: '@my/react/machine' },
 *         lit: { outDir: (entry) => `libs/my-wc/${entry}/src/generated`, runtime: { file: 'libs/my-wc/machine/src/index' } },
 *       },
 *     });
 *
 * @param {FrontTemplatesConfig} config
 */
export const defineConfig = (config) => config;

/**
 * @typedef {object} FrontConfig
 * @property {(entry: string) => string} outDir  Where an entry's generated files go, relative to the workspace.
 * @property {string | { file: string }} [runtime]  React / Lit: the module exporting the prop-bag helpers — a
 *   specifier, or a workspace file (no extension) imported by a path relative to each generated file.
 *
 * @typedef {object} FrontTemplatesConfig
 * @property {string} root  The directory holding one sub-directory per entry.
 * @property {string} [templates]  Where an entry keeps its view templates (default `src/templates`).
 * @property {Partial<Record<keyof typeof FRONTS, FrontConfig>>} fronts
 */

/** A `runtime` as the generated file in `outDir` must import it. */
function runtimeSpecifier(runtime, outDir, cwd) {
  if (runtime === undefined || typeof runtime === 'string') return runtime;
  const path = relative(outDir, resolve(cwd, runtime.file)).replace(/\\/g, '/');
  return path.startsWith('.') ? path : `./${path}`;
}

/** Every `<root>/<entry>/<templates>/*.view.vue`, with its entry name. */
function findSources(config, cwd) {
  const root = resolve(cwd, config.root);
  const templates = config.templates ?? 'src/templates';
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const dir = join(root, d.name, templates);
      return existsSync(dir)
        ? readdirSync(dir)
            .filter((f) => f.endsWith('.view.vue'))
            .map((f) => ({ entry: d.name, file: join(dir, f), base: f.replace(/\.vue$/, '') }))
        : [];
    });
}

/**
 * Compile every view template under `config.root` into each configured front.
 * Only files whose text changed are written. With `check`, nothing is written and
 * the stale paths are returned instead (a CI guard against hand edits).
 *
 * @param {FrontTemplatesConfig} config
 * @param {{ cwd?: string, check?: boolean }} [options]
 * @returns {{ templates: number, stale: string[] }}
 */
export function compileFrontTemplates(config, { cwd = process.cwd(), check = false } = {}) {
  const unknown = Object.keys(config.fronts).filter((name) => !(name in FRONTS));
  if (unknown.length) throw new Error(`front-templates: unknown front(s) ${unknown.join(', ')}; expected ${Object.keys(FRONTS).join(', ')}`);

  const sources = findSources(config, cwd);
  const stale = sources.flatMap(({ entry, file, base }) => {
    const src = readSource(relative(cwd, file), readFileSync(file, 'utf8'));
    return Object.entries(config.fronts).flatMap(([name, front]) => {
      const outDir = resolve(cwd, front.outDir(entry));
      const out = join(outDir, `${base}.generated.${FRONTS[name].ext}`);
      const text = FRONTS[name].emit(src, { runtime: runtimeSpecifier(front.runtime, outDir, cwd) });
      if (existsSync(out) && readFileSync(out, 'utf8') === text) return [];
      if (!check) {
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, text);
      }
      return [relative(cwd, out)];
    });
  });
  return { templates: sources.length, stale };
}
