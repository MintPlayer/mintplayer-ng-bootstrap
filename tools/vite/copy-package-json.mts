/**
 * Copy the lib's own `package.json` into the build output.
 *
 * This used to happen as a side effect of `nxViteTsPaths` (its `writeBundle`
 * hook copied `<projectRoot>/package.json` into `outDir`). That plugin is
 * deprecated and gone now that Vite 8 resolves tsconfig `paths` natively
 * (`resolve.tsconfigPaths`), but the copy is load-bearing: the published
 * package needs its manifest, and `generateSubpathExports` (multi-entry.mts)
 * rewrites that copied file in `closeBundle` to add the subpath `exports`.
 *
 * Runs in `writeBundle`, which precedes every plugin's `closeBundle`. A missing
 * source manifest fails the build instead of shipping a package without one.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

export function copyPackageJson(libRoot: string): Plugin {
  return {
    name: 'mp-copy-package-json',
    apply: 'build',
    writeBundle(options) {
      const src = resolve(libRoot, 'package.json');
      if (!existsSync(src)) this.error(`copyPackageJson: ${src} is missing`);
      const outDir = options.dir ?? resolve(libRoot, 'dist');
      copyFileSync(src, join(outDir, 'package.json'));
    },
  };
}
