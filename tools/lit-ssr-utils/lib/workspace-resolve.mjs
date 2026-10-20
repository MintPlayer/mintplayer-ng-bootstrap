/**
 * Lets plain Node load a built web-component entry that imports a sibling
 * workspace package.
 *
 * The web-components build externalizes `@mintplayer/ui-core` (a published
 * dependency, #436), so `dist/.../index.mjs` keeps the bare specifier. Bundlers
 * resolve it through the tsconfig paths; Node only looks in `node_modules`,
 * where an unpublished workspace package is absent. This hook points the
 * specifier at the built ui-core in `dist/` instead, which is why every chrome
 * target depends on `mintplayer-ui-core:build`.
 */
import { registerHooks } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const WORKSPACE_PACKAGES = { '@mintplayer/ui-core': 'dist/libs/mintplayer-ui-core' };

let registered = false;

/** Maps `@mintplayer/ui-core/<entry>` to `<dist>/<entry>/index.mjs`. Idempotent. */
export function registerWorkspaceResolution(repoRoot) {
  if (registered) return;
  registered = true;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const match = Object.entries(WORKSPACE_PACKAGES).find(
        ([name]) => specifier === name || specifier.startsWith(`${name}/`),
      );
      if (!match) return nextResolve(specifier, context);
      const [name, dist] = match;
      const entry = specifier.slice(name.length + 1) || '.';
      return {
        url: pathToFileURL(resolve(repoRoot, dist, entry, 'index.mjs')).href,
        shortCircuit: true,
      };
    },
  });
}
