// The Nx plugin half of @mintplayer/nx-component-compiler (PRD #437 D10).
//
// Every `component-compiler.config.mjs` adds two targets to the project that
// holds it:
//
//   compile-components        generate the fronts (cached; the outputs are the
//                             front libs' `<entry>/src/generated` directories)
//   compile-components-check  write nothing, fail when a generated file is
//                             stale (CI, and for a tree that must stay clean)
//
// The inputs are the component sources, the extension files next to each
// front's output, the config and the compiler itself, so a cache hit is safe.
const { dirname, join, relative, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { createNodesFromFiles } = require('@nx/devkit');

const COMPILER_ROOT = resolve(__dirname, '..', '..');
const BIN = join(COMPILER_ROOT, 'bin', 'component-compiler.mjs');

const slash = (path) => path.replace(/\\/g, '/');

async function createNodesInternal(configFile, options, context) {
  const projectRoot = dirname(configFile);
  const absolute = join(context.workspaceRoot, configFile);
  const { default: config } = await import(`${pathToFileURL(absolute).href}?t=${Date.now()}`);
  const compiler = slash(relative(context.workspaceRoot, COMPILER_ROOT));
  const bin = slash(relative(context.workspaceRoot, BIN));
  const templates = config.templates ?? 'src/templates';
  const fronts = Object.entries(config.fronts ?? {});
  // `outDir('*')` turns the per-entry function into a glob over the front lib.
  const outputs = fronts.flatMap(([, front]) => [front.outDir('*'), front.outDir('*/*')].map((dir) => `{workspaceRoot}/${slash(dir)}`));
  const extensions = fronts.flatMap(([name, front]) => ['*', '*/*'].map((e) => `{workspaceRoot}/${slash(dirname(front.outDir(e)))}/*.${name}.ts`));
  const rel = slash(relative(projectRoot, config.root));
  const root = rel ? `{projectRoot}/${rel}` : '{projectRoot}';
  const inputs = [
    `${root}/*/${templates}/*.view.vue`,
    // Entries may sit one level down (`charts/trend`).
    `${root}/*/*/${templates}/*.view.vue`,
    `${root}/*/src/*.component.ts`,
    `${root}/*/*/src/*.component.ts`,
    `{projectRoot}/${slash(relative(projectRoot, configFile))}`,
    // A composed child's manifest and template shape the parent's output.
    ...(config.registry ?? []).flatMap((file) => [`{workspaceRoot}/${slash(file)}`, `{workspaceRoot}/${slash(dirname(file))}/**/*.view.vue`, `{workspaceRoot}/${slash(dirname(file))}/**/*.component.ts`]),
    ...extensions,
    `{workspaceRoot}/${compiler}/src/**/*.mjs`,
    `{workspaceRoot}/${compiler}/bin/*.mjs`,
    { externalDependencies: ['@vue/compiler-sfc', '@babel/parser'] },
  ];
  const command = `node ${bin} --config ${slash(configFile)}`;
  const targetName = options?.targetName ?? 'compile-components';
  return {
    projects: {
      [projectRoot]: {
        targets: {
          [targetName]: {
            command,
            cache: true,
            inputs,
            outputs,
            metadata: {
              description: 'Generate the Angular, React, Vue and Lit components from the component sources (PRD #437 D10).',
              technologies: ['nx-component-compiler'],
            },
          },
          [`${targetName}-check`]: {
            command: `${command} --check`,
            cache: true,
            inputs: [...inputs, ...outputs.map((glob) => `${glob}/**/*`)],
            metadata: { description: 'Fail when a generated component is missing, stale or orphaned.' },
          },
        },
      },
    },
  };
}

/** @type {import('@nx/devkit').CreateNodesV2<{ targetName?: string }>} */
const createNodesV2 = [
  '**/component-compiler.config.mjs',
  (configFiles, options, context) => createNodesFromFiles(createNodesInternal, configFiles, options, context),
];

module.exports = { createNodesV2 };
