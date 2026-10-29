import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * PRD #437 S19: the compiler as a consumer gets it. The package is packed with
 * `npm pack` (so only what `files` publishes is there) and run in a workspace
 * that has nothing of this repo's layout: another core package, other front
 * directories, no `libs/mintplayer-*`. Every front must be generated, and no
 * output may name a path of this repo.
 */
const lib = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(lib, '../..');
const fixture = join(repo, 'dist', 'component-compiler-fixture');
const installed = join(fixture, 'node_modules', '@mintplayer', 'nx-component-compiler');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const write = (file: string, text: string) => {
  mkdirSync(dirname(join(fixture, file)), { recursive: true });
  writeFileSync(join(fixture, file), text);
};

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));

const compile = (...args: string[]) =>
  execFileSync(process.execPath, [join(installed, 'bin', 'component-compiler.mjs'), '--config', 'component-compiler.config.mjs', ...args], {
    cwd: fixture,
    encoding: 'utf8',
  });

describe('the packed compiler in a foreign workspace (S19)', () => {
  beforeAll(() => {
    rmSync(fixture, { recursive: true, force: true });
    mkdirSync(installed, { recursive: true });
    const tarball = execFileSync(npm, ['pack', '--silent', '--pack-destination', fixture], { cwd: lib, encoding: 'utf8', shell: process.platform === 'win32' })
      .trim()
      .split('\n')
      .pop() as string;
    // Relative paths: GNU tar on Windows reads `C:` as a remote host.
    execFileSync('tar', ['-xzf', tarball, '--strip-components=1', '-C', 'node_modules/@mintplayer/nx-component-compiler'], { cwd: fixture });

    write('package.json', JSON.stringify({ name: 'acme', private: true, type: 'module' }));
    write(
      'component-compiler.config.mjs',
      [
        "import { defineConfig } from '@mintplayer/nx-component-compiler';",
        'export default defineConfig({',
        "  root: 'libs/acme-core',",
        "  package: '@acme/core',",
        '  fronts: {',
        "    angular: { outDir: (e) => `libs/acme-ng/${e}/src/generated`, runtime: '@mintplayer/ng-bootstrap/machine' },",
        "    react: { outDir: (e) => `libs/acme-react/${e}/src/generated`, runtime: '@mintplayer/react-bootstrap/machine' },",
        "    vue: { outDir: (e) => `libs/acme-vue/${e}/src/generated`, runtime: '@mintplayer/vue-bootstrap/machine' },",
        "    lit: { outDir: (e) => `libs/acme-wc/${e}/src/generated`, runtime: '@mintplayer/web-components/machine' },",
        '  },',
        '});',
        '',
      ].join('\n'),
    );
    write(
      'libs/acme-core/greeting/src/greeting.component.ts',
      [
        "import type { ComponentGroup } from '@mintplayer/ui-core/component';",
        '',
        'export default {',
        "  group: 'greeting',",
        "  style: { scope: 'greeting' },",
        '  components: {',
        "    greeting: {",
        "      core: 'greetingCore',",
        "      doc: 'Says hello.',",
        "      inputs: { type: 'GreetingInputs', fields: { name: { default: \"'world'\" } } },",
        '    },',
        '  },',
        '} satisfies ComponentGroup;',
        '',
      ].join('\n'),
    );
    write(
      'libs/acme-core/greeting/src/templates/greeting.view.vue',
      [
        '<script setup lang="ts">',
        "import type { GreetingProps } from '@acme/core/greeting';",
        '',
        "defineProps<{ root: GreetingProps['root']; text: string }>();",
        '</script>',
        '',
        '<template>',
        '  <span mp-host ref="root" v-bind="root">{{ text }}</span>',
        '</template>',
        '',
      ].join('\n'),
    );
    write('libs/acme-core/greeting/index.ts', "export * from './src';\n");
    write(
      'libs/acme-core/greeting/src/index.ts',
      [
        "import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';",
        '',
        "export const greetingScopedStyles = '.greeting[data-mps=greeting] { font-weight: bold; }';",
        'export interface GreetingInputs { name: string }',
        'export interface GreetingProps { root: CoreBag; text: string }',
        'export const greetingCore = defineCore<GreetingInputs, object, GreetingProps>({',
        "  view: ({ inputs }) => ({ root: { class: 'greeting' }, text: `Hello, ${inputs.name}` }),",
        '});',
        '',
      ].join('\n'),
    );
    // The runtimes come from this repo's sources, as a consumer's would from node_modules.
    // `paths` replaces the base's mapping, so it is restated with absolute targets.
    const base = JSON.parse(readFileSync(join(repo, 'tsconfig.base.json'), 'utf8'));
    const paths = Object.fromEntries(
      Object.entries(base.compilerOptions.paths as Record<string, string[]>).map(([key, targets]) => [key, targets.map((target) => join(repo, target).replace(/\\/g, '/'))]),
    );
    write(
      'tsconfig.json',
      JSON.stringify({
        extends: join(repo, 'tsconfig.base.json').replace(/\\/g, '/'),
        compilerOptions: {
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          rootDir: repo.replace(/\\/g, '/'),
          types: ['node'],
          typeRoots: [join(repo, 'node_modules/@types').replace(/\\/g, '/')],
          paths: { ...paths, '@acme/core/*': ['./libs/acme-core/*'] },
        },
        include: ['libs/acme-*/**/*.ts', 'libs/acme-*/**/*.tsx', 'libs/acme-*/**/*.vue'],
      }),
    );
  }, 120_000);

  afterAll(() => process.env['KEEP_FIXTURE'] || rmSync(fixture, { recursive: true, force: true }));

  it('generates every front, then reports them up to date', () => {
    expect(compile()).toMatch(/1 component\(s\)/);
    const generated = ['acme-ng', 'acme-react', 'acme-vue', 'acme-wc'].map((front) => walk(join(fixture, 'libs', front, 'greeting', 'src', 'generated')));
    generated.forEach((files) => expect(files.length).toBeGreaterThan(0));
    expect(compile('--check')).toMatch(/all up to date/);
  });

  it('names no path of this repository in any output', () => {
    const outputs = ['acme-ng', 'acme-react', 'acme-vue', 'acme-wc'].flatMap((front) => walk(join(fixture, 'libs', front)));
    const leaks = outputs.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return /libs\/mintplayer|mintplayer-ui-core/.test(text) || text.includes(repo) || text.includes(repo.replace(/\\/g, '/'));
    });
    expect(leaks).toEqual([]);
  });

  it('imports the core from the configured package and the scoped-style registry from ui-core', () => {
    const lit = walk(join(fixture, 'libs/acme-wc/greeting/src/generated')).map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(lit).toContain("'@acme/core/greeting'");
    expect(lit).toContain("from '@mintplayer/ui-core/scoped-styles'");
    // S15: the group's scope comes from the manifest, onto the host, not from the core's bag.
    expect(lit).toContain("installLightStyles('greeting', greetingScopedStyles)");
    expect(lit).toContain("'data-mps': 'greeting'");
  });

  it('type-checks all four fronts against the core and the runtimes', () => {
    const vueTsc = join(repo, 'node_modules', 'vue-tsc', 'bin', 'vue-tsc.js');
    const run = () => execFileSync(process.execPath, [vueTsc, '--noEmit', '-p', 'tsconfig.json'], { cwd: fixture, encoding: 'utf8', stdio: 'pipe' });
    expect(run).not.toThrow();
  }, 120_000);
});
