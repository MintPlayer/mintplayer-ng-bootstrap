// @mintplayer/nx-component-compiler — compiles a headless component source
// into Angular, React, Vue and Lit components (PRD #437 D10).
//
// A component group lives in one entry of a core library:
//
//   <root>/<entry>/src/
//     <entry>.component.ts         the manifest (plain data, `satisfies ComponentGroup`)
//     <entry>.core.ts              the cores (`defineCore`), exported by the entry
//     templates/<element>.view.vue the markup, one Vue-syntax SFC per element
//     styles/<entry>.scoped.scss   the group's scoped sheet
//
// Two stages run per entry. The template stage compiles each view template into
// each front's own template syntax (`templates/`, from spike S13). The
// component stage reads the manifest and writes the components that host the
// core around those templates, plus a barrel, into `<front lib>/<entry>/src/generated/`.
// An entry with templates but no manifest gets the template stage only.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { GENERATOR, readSource } from './templates/source.mjs';
import { emitAngular } from './templates/emit-angular.mjs';
import { emitReact } from './templates/emit-react.mjs';
import { emitVue } from './templates/emit-vue.mjs';
import { emitLit } from './templates/emit-lit.mjs';
import { componentModels } from './components/model.mjs';
import { emitAngularComponent } from './components/emit-angular.mjs';
import { emitReactComponent } from './components/emit-react.mjs';
import { emitVueComponent } from './components/emit-vue.mjs';
import { emitLitComponent } from './components/emit-lit.mjs';

export { readSource, TemplateError, HOST_MARKER, GENERATOR } from './templates/source.mjs';
export { emitAngular, emitReact, emitVue, emitLit };
export { emitAngularComponent, emitReactComponent, emitVueComponent, emitLitComponent, componentModels };

/** A generated Angular component holds its template's props in one `props` signal, so a prop never clashes with an input. */
const ANGULAR_PROP = (name) => `props().${name}`;

/** Per front: the template emitter, its extension, and the component emitter with its barrel line. */
export const FRONTS = {
  angular: {
    ext: 'html',
    template: (src, options) => emitAngular(src, options).text,
    component: emitAngularComponent,
    barrel: (out) => `export { ${out.exports.join(', ')} } from './${out.file.replace(/\.ts$/, '')}';`,
  },
  react: {
    ext: 'tsx',
    template: emitReact,
    component: emitReactComponent,
    barrel: (out) => `export { ${out.exports.join(', ')} } from './${out.file.replace(/\.tsx$/, '')}';`,
  },
  vue: {
    ext: 'vue',
    template: emitVue,
    component: emitVueComponent,
    barrel: (out) => `export { default as ${out.exports[0]} } from './${out.file}';`,
  },
  lit: {
    ext: 'ts',
    template: emitLit,
    component: emitLitComponent,
    barrel: (out) => `export { ${out.exports.join(', ')} } from './${out.file.replace(/\.ts$/, '')}';`,
  },
};

/**
 * Identity, for a typed config file:
 *
 *     export default defineConfig({
 *       root: 'libs/my-core',              // <root>/<entry>/src/…
 *       package: '@my/core',               // the generated fronts import `@my/core/<entry>`
 *       fronts: {
 *         angular: { outDir: (entry) => `libs/my-ng/${entry}/src/generated`, runtime: '@my/ng/machine' },
 *         react: { outDir: (entry) => `libs/my-react/${entry}/src/generated`, runtime: { file: 'libs/my-react/machine/src/index' } },
 *       },
 *     });
 *
 * @param {ComponentCompilerConfig} config
 */
export const defineConfig = (config) => config;

/**
 * @typedef {object} FrontConfig
 * @property {(entry: string) => string} outDir  Where an entry's generated files go, relative to the workspace.
 * @property {string | { file: string }} [runtime]  The front's bridge module (prop-bag helpers, `useCore`): a
 *   specifier, or a workspace file (no extension) imported by a path relative to each generated file.
 * @property {(entry: string, element: string) => string} [extension]  An element's hand-written extension file
 *   (default `<outDir>/../<element>.<front>.ts`).
 *
 * @typedef {object} ComponentCompilerConfig
 * @property {string} root  The directory holding one sub-directory per entry.
 * @property {string} package  The core library's package name.
 * @property {string} [templates]  Where an entry keeps its view templates (default `src/templates`).
 * @property {Partial<Record<keyof typeof FRONTS, FrontConfig>>} fronts
 */

/** A workspace file as a module specifier relative to `fromDir`, without its extension. */
function relativeSpecifier(file, fromDir, cwd) {
  const path = relative(fromDir, resolve(cwd, file)).replace(/\\/g, '/').replace(/\.(ts|tsx|mjs|js)$/, '');
  return path.startsWith('.') ? path : `./${path}`;
}

function runtimeSpecifier(runtime, outDir, cwd) {
  if (runtime === undefined || typeof runtime === 'string') return runtime;
  return relativeSpecifier(runtime.file, outDir, cwd);
}

/**
 * Every entry with a templates directory, with its sources and its manifest (if any).
 * An entry may sit one level down (`charts/trend`); its manifest is named after
 * the last segment (`trend.component.ts`) and its group is the whole path.
 */
function findEntries(config, cwd) {
  const root = resolve(cwd, config.root);
  const templates = config.templates ?? 'src/templates';
  const dirs = (parent) =>
    readdirSync(join(root, parent), { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'node_modules' && !d.name.startsWith('.'))
      .map((d) => (parent ? `${parent}/${d.name}` : d.name));
  return dirs('')
    .flatMap((top) => (existsSync(join(root, top, templates)) ? [top] : existsSync(join(root, top, 'src')) ? [] : dirs(top)))
    .filter((entry) => existsSync(join(root, entry, templates)))
    .map((entry) => {
      const dir = join(root, entry, templates);
      const manifest = join(root, entry, 'src', `${entry.split('/').pop()}.component.ts`);
      return {
        entry,
        sources: readdirSync(dir)
          .filter((f) => f.endsWith('.view.vue'))
          .map((f) => ({ file: join(dir, f), base: f.replace(/\.vue$/, '') })),
        manifest: existsSync(manifest) ? manifest : null,
      };
    });
}

/** Node strips the manifest's types itself (it may only `import type`). */
async function loadManifest(file) {
  const module = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const group = module.default;
  if (!group?.group || !group.components) throw new Error(`${file}: the default export must be a ComponentGroup`);
  return group;
}

/** The files one entry produces in one front, keyed by absolute path. */
async function entryOutputs(config, cwd, entry, name, front) {
  const outDir = resolve(cwd, front.outDir(entry.entry));
  const runtime = runtimeSpecifier(front.runtime, outDir, cwd);
  const files = new Map();
  const sources = new Map(
    entry.sources.map(({ file, base }) => [`${base}.vue`, readSource(relative(cwd, file).replace(/\\/g, '/'), readFileSync(file, 'utf8'))]),
  );
  sources.forEach((src, key) => {
    files.set(join(outDir, `${key.replace(/\.vue$/, '')}.generated.${FRONTS[name].ext}`), FRONTS[name].template(src, { runtime, ...(entry.manifest && name === 'angular' ? { prop: ANGULAR_PROP } : {}) }));
  });

  if (entry.manifest) {
    const group = await loadManifest(entry.manifest);
    if (group.group !== entry.entry) throw new Error(`${entry.manifest}: group "${group.group}" must match its entry "${entry.entry}"`);
    const models = componentModels({
      group,
      entry: entry.entry,
      corePackage: config.package,
      template: (file) => {
        const src = sources.get(file);
        if (!src) throw new Error(`${entry.entry}: no template ${file}`);
        return src;
      },
      extension: (frontName, element) => {
        const target = config.fronts[frontName];
        if (!target) return null;
        return target.extension
          ? resolve(cwd, target.extension(entry.entry, element))
          : join(resolve(cwd, target.outDir(entry.entry)), '..', `${element}.${frontName}.ts`);
      },
    });
    const outputs = models.map((model) =>
      FRONTS[name].component(model, { generator: GENERATOR, runtime, extension: (file) => relativeSpecifier(file, outDir, cwd) }),
    );
    outputs.forEach((out) => files.set(join(outDir, out.file), out.text));
    const barrel = [`// GENERATED from the ${group.group} manifest by ${GENERATOR}. Do not edit.`, ...outputs.map(FRONTS[name].barrel), ''].join('\n');
    files.set(join(outDir, 'index.ts'), barrel);
  }
  return { outDir, files };
}

/**
 * Compile every entry under `config.root` into each configured front. Only
 * files whose text changed are written, and generated files that no longer
 * have a source are removed. With `check`, nothing is touched and the stale
 * paths are returned instead (a CI guard against hand edits).
 *
 * @param {ComponentCompilerConfig} config
 * @param {{ cwd?: string, check?: boolean }} [options]
 * @returns {Promise<{ templates: number, components: number, stale: string[] }>}
 */
export async function compileComponents(config, { cwd = process.cwd(), check = false } = {}) {
  const unknown = Object.keys(config.fronts).filter((name) => !(name in FRONTS));
  if (unknown.length) throw new Error(`component-compiler: unknown front(s) ${unknown.join(', ')}; expected ${Object.keys(FRONTS).join(', ')}`);
  if (!config.package) throw new Error('component-compiler: config.package (the core package name) is required');

  const entries = findEntries(config, cwd);
  const stale = [];
  let components = 0;
  for (const entry of entries) {
    for (const [name, front] of Object.entries(config.fronts)) {
      const { outDir, files } = await entryOutputs(config, cwd, entry, name, front);
      if (name === 'angular' && entry.manifest) components += [...files.keys()].filter((f) => f.endsWith('.component.generated.ts')).length;
      for (const [path, text] of files) {
        if (existsSync(path) && readFileSync(path, 'utf8') === text) continue;
        stale.push(relative(cwd, path));
        if (!check) {
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, text);
        }
      }
      // Outputs whose source is gone.
      if (existsSync(outDir)) {
        readdirSync(outDir)
          .map((f) => join(outDir, f))
          .filter((path) => !files.has(path))
          .forEach((path) => {
            stale.push(relative(cwd, path));
            if (!check) rmSync(path, { recursive: true });
          });
      }
    }
  }
  return { templates: entries.reduce((n, e) => n + e.sources.length, 0), components, stale };
}
