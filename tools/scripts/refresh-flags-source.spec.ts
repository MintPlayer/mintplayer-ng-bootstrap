/**
 * refresh-flags' `resolveSource`: where the upstream flag artwork comes from.
 *
 * It has two paths and both carry a decision worth pinning. The local path must
 * reuse an installed node_modules copy and never touch the network. The fetch
 * path must use `npm pack` (which leaves the lockfile and node_modules alone)
 * and must extract with a BARE tarball name from inside the scratch dir — an
 * absolute `C:\...` path reaches git-bash's GNU tar as a remote `host:path`
 * and fails with "Cannot connect to C". `child_process` is mocked, so no
 * network or tar binary is involved; the spec plays npm and tar.
 *
 * Its own file because the mock is module-wide, and the main() suite in
 * refresh-flags.spec.ts must not run under it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveSource } from './refresh-flags.mjs';

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFileSync: vi.fn(),
}));

const exec = vi.mocked(execFileSync);
const repos: string[] = [];
const makeRepo = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'mp-refresh-src-')));
  repos.push(root);
  return root;
};
afterAll(() => repos.map((root) => rmSync(root, { recursive: true, force: true })));

beforeEach(() => {
  exec.mockReset();
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  return () => log.mockRestore();
});

describe('resolveSource', () => {
  it('reuses an installed country-flag-icons without running anything', async () => {
    const root = makeRepo();
    const local = join(root, 'node_modules', 'country-flag-icons');
    mkdirSync(join(local, '3x2'), { recursive: true });

    const { dir, cleanup } = await resolveSource(root);
    expect(dir).toBe(local);
    expect(exec).not.toHaveBeenCalled();
    await cleanup();
    expect(existsSync(local)).toBe(true);
  });

  it('packs the pinned version into a scratch dir and extracts it there by bare name', async () => {
    const root = makeRepo();
    const scratch = join(tmpdir(), `mp-refresh-flags-${process.pid}`);
    exec.mockImplementation(((cmd: string, args: string[]) => {
      if (cmd === 'tar') {
        mkdirSync(join(scratch, 'package'), { recursive: true });
        return Buffer.from('');
      }
      // npm prints notices before the tarball name; only the last line is it.
      return 'npm notice some banner\ncountry-flag-icons-1.6.20.tgz\n';
    }) as never);

    const { dir, cleanup } = await resolveSource(root);

    const [npmCall, tarCall] = exec.mock.calls;
    expect(npmCall[0]).toBe(process.platform === 'win32' ? 'npm.cmd' : 'npm');
    expect(npmCall[1]).toEqual(['pack', 'country-flag-icons@1.6.20', '--pack-destination', scratch, '--silent']);
    expect(tarCall[0]).toBe('tar');
    expect(tarCall[1]).toEqual(['-xzf', 'country-flag-icons-1.6.20.tgz']);
    expect(tarCall[2]).toMatchObject({ cwd: scratch });
    expect(dir).toBe(join(scratch, 'package'));

    await cleanup();
    expect(existsSync(scratch)).toBe(false);
  });

  it('fetches when node_modules holds the package without its 3x2 artwork', async () => {
    const root = makeRepo();
    mkdirSync(join(root, 'node_modules', 'country-flag-icons'), { recursive: true });
    exec.mockImplementation((() => 'x.tgz') as never);

    const { cleanup } = await resolveSource(root);
    expect(exec).toHaveBeenCalledTimes(2);
    await cleanup();
  });
});
