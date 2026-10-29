import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createNodesV2 } = require('./plugin.cjs') as {
  createNodesV2: [string, (files: string[], options: unknown, context: unknown) => Promise<[string, { projects: Record<string, { targets: Record<string, { cache?: boolean; outputs?: string[] }> }> }][]>];
};

const WORKSPACE = resolve(import.meta.dirname, '../../../..');
const CONFIG = 'libs/mintplayer-ui-core/component-compiler.config.mjs';

async function targets() {
  const [, create] = createNodesV2;
  const [[, result]] = await create([CONFIG], {}, { workspaceRoot: WORKSPACE, nxJsonConfiguration: {} });
  return result.projects['libs/mintplayer-ui-core'].targets;
}

describe('nx-component-compiler plugin', () => {
  // Regression (CI run 40890169814): a cached compile-components entry recorded
  // while two processes wrote the same directories had no calendar output, and
  // every build hashing the same restored it. The run takes a second: never cache it.
  it('does not cache compile-components', async () => {
    const t = await targets();
    expect(t['compile-components'].cache).toBe(false);
    expect(t['compile-components'].outputs?.length).toBeGreaterThan(0);
  });

  it('keeps the check target, which hashes the outputs too', async () => {
    const t = await targets();
    expect(t['compile-components-check'].cache).toBe(true);
  });
});
