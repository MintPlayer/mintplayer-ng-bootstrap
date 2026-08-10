/**
 * Shared multi-entrypoint machinery for the @mintplayer/* vite-built libs
 * (web-components, react-bootstrap, vue-bootstrap).
 *
 * A directory is a sub-entrypoint when it has `src/index.ts` (and, where the
 * lib uses barrels, an `index.ts` barrel that becomes the build entry so the
 * emitted `<entry>/index.mjs` and `<entry>/index.d.ts` land at the same path).
 * Namespace directories one level deep (e.g. `charts/hierarchy`) are
 * discovered too: a root-level dir that is not itself an entrypoint is scanned
 * for child entrypoints, keyed `<ns>/<name>/index`.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

export interface DiscoverEntriesOptions {
  /**
   * When true (web-components), an entrypoint needs BOTH `src/index.ts` and an
   * `index.ts` barrel, and the barrel is the build entry. When false
   * (react/vue), `src/index.ts` alone qualifies and is the entry.
   */
  requireBarrel?: boolean;
}

export function discoverEntries(libRoot: string, options: DiscoverEntriesOptions = {}): Record<string, string> {
  const { requireBarrel = false } = options;
  const entries: Record<string, string> = {};

  // Primary entry — a thin re-export root at src/index.ts.
  const primary = resolve(libRoot, 'src/index.ts');
  if (existsSync(primary)) entries['index'] = primary;

  const entryFileOf = (dir: string): string | null => {
    if (!existsSync(join(dir, 'src', 'index.ts'))) return null;
    if (!requireBarrel) return join(dir, 'src', 'index.ts');
    const barrel = join(dir, 'index.ts');
    return existsSync(barrel) ? barrel : null;
  };

  const skip = (name: string) => name.startsWith('.') || name.startsWith('_') || name === 'node_modules' || name === 'src' || name === 'dist';

  for (const name of readdirSync(libRoot)) {
    if (skip(name)) continue;
    const subRoot = join(libRoot, name);
    if (!statSync(subRoot).isDirectory()) continue;

    const direct = entryFileOf(subRoot);
    if (direct) {
      entries[`${name}/index`] = direct;
      continue;
    }

    // Not an entrypoint itself — treat as a namespace dir and scan one level deeper.
    for (const child of readdirSync(subRoot)) {
      if (skip(child)) continue;
      const childRoot = join(subRoot, child);
      if (!statSync(childRoot).isDirectory()) continue;
      const nested = entryFileOf(childRoot);
      if (nested) entries[`${name}/${child}/index`] = nested;
    }
  }

  return entries;
}

/**
 * Write one `exports` subpath per discovered entry into the built package.json,
 * derived from the same `discoverEntries()` scan as `lib.entry`. Adding a new
 * entrypoint directory is the only step needed — its export appears
 * automatically.
 *
 * `moduleResolution: bundler` consumers resolve subpaths only through
 * `exports`; Vite emits the `<entry>/index.mjs` files but does not write
 * subpath exports.
 */
export function generateSubpathExports(outDir: string, libRoot: string, entries: Record<string, string>): Plugin {
  return {
    name: 'mp-generate-subpath-exports',
    // Run after nxViteTsPaths' writeBundle has copied package.json into dist.
    closeBundle() {
      const pkgPath = join(outDir, 'package.json');
      if (!existsSync(pkgPath)) return;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const exportsMap: Record<string, unknown> = { ...(pkg.exports ?? {}) };

      for (const [key, file] of Object.entries(entries)) {
        const rel = relative(libRoot, file).split(sep).join('/'); // e.g. 'calendar/index.ts' | 'treeview/src/index.ts'
        const subpath = key === 'index' ? '.' : `./${key.replace(/\/index$/, '')}`;
        exportsMap[subpath] = {
          types: `./${rel.replace(/\.ts$/, '.d.ts')}`,
          import: `./${key}.mjs`,
        };
      }

      pkg.exports = exportsMap;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    },
  };
}
