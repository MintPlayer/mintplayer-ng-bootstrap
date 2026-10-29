import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsTree } from 'nx/src/generators/tree';
import { afterEach, describe, expect, it } from 'vitest';

const componentGenerator = createRequire(import.meta.url)('./component.generator.cjs');

const CONFIG = [
  'export default {',
  "  root: 'packages/core',",
  "  package: '@acme/core',",
  "  fronts: { react: { outDir: (e) => `packages/react/${e}/src/generated` } },",
  '};',
  '',
].join('\n');

/**
 * PRD #437 S19: the published generator assumes no layout. Without `--config`
 * it uses the workspace's only component-compiler config, wherever it lives,
 * and refuses to guess between none or several.
 */
describe('component generator config discovery', () => {
  const dirs: string[] = [];
  const workspace = (configs: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), 'component-generator-'));
    dirs.push(dir);
    const tree = new FsTree(dir, false);
    configs.forEach((file) => tree.write(file, CONFIG));
    // The generator imports the config from disk.
    configs.forEach((file) => writeFileSync(join(dir, ...file.split('/')), CONFIG));
    return tree;
  };
  afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('uses the only config, wherever it is', async () => {
    const tree = workspace([]);
    tree.write('tools/compiler/component-compiler.config.mjs', CONFIG);
    mkdirSync(join(tree.root, 'tools', 'compiler'), { recursive: true });
    writeFileSync(join(tree.root, 'tools', 'compiler', 'component-compiler.config.mjs'), CONFIG);
    await componentGenerator(tree, { name: 'badge', skipFormat: true });
    expect(tree.exists('packages/core/badge/src/badge.component.ts')).toBe(true);
    expect(tree.exists('packages/react/badge/src/index.ts')).toBe(true);
  });

  it('refuses a workspace with no config', async () => {
    await expect(componentGenerator(workspace([]), { name: 'badge', skipFormat: true })).rejects.toThrow(/pass --config \(found 0/);
  });

  it('refuses to choose between two configs and names them', async () => {
    const tree = workspace(['component-compiler.config.mjs']);
    tree.write('other/component-compiler.config.mjs', CONFIG);
    await expect(componentGenerator(tree, { name: 'badge', skipFormat: true })).rejects.toThrow(/found 2 .*other\/component-compiler\.config\.mjs/);
  });
});
