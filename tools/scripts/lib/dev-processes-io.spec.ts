/**
 * The I/O half of lib/dev-processes.mjs: which OS command each platform runs to
 * find a port's owner, list processes and kill a tree, and how `reclaimPort`
 * turns those into a decision. dev-processes.spec.ts covers the pure rules on
 * captured listings; this covers the wiring around them.
 *
 * `child_process` is mocked (the spec plays powershell, lsof, ps and taskkill)
 * and `node:os` reports whichever platform a case needs, because the module
 * reads `platform()` once at load — each platform gets a fresh import.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ platform: 'linux' as string }));

vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:os')>()),
  platform: () => state.platform,
}));
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawnSync: vi.fn(),
}));

type Reply = { stdout?: string } | Error;
type Mod = typeof import('./dev-processes.mjs');

/** Load the module as `platform`, with `replies[cmd]` answering each spawnSync. */
async function load(platform: string, replies: Record<string, Reply | (() => Reply)> = {}) {
  state.platform = platform;
  vi.resetModules();
  const { spawnSync } = await import('node:child_process');
  const spawn = vi.mocked(spawnSync);
  spawn.mockReset();
  spawn.mockImplementation(((cmd: string) => {
    const reply = replies[cmd];
    const value = typeof reply === 'function' ? reply() : reply;
    if (value instanceof Error) throw value;
    return value ?? { stdout: '' };
  }) as never);
  const mod: Mod = await import('./dev-processes.mjs');
  return { mod, spawn, calls: () => spawn.mock.calls.map(([cmd, args]) => [cmd, args] as [string, string[]]) };
}

let kill: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  kill = vi.spyOn(process, 'kill').mockImplementation(() => true);
});
afterEach(() => {
  kill.mockRestore();
  vi.restoreAllMocks();
});

describe('on Windows', () => {
  it('finds a port\'s listeners with Get-NetTCPConnection', async () => {
    const { mod, calls } = await load('win32', { powershell: { stdout: '123\r\n456\r\n' } });
    expect(mod.findPortOwners(4200)).toEqual([{ pid: 123 }, { pid: 456 }]);
    const [[cmd, args]] = calls();
    expect(cmd).toBe('powershell');
    expect(args.slice(0, 3)).toEqual(['-NoProfile', '-NonInteractive', '-Command']);
    expect(args[3]).toMatch(/^Get-NetTCPConnection -LocalPort 4200 -State Listen /);
  });

  it('lists processes through Win32_Process with a delimiter no command line contains', async () => {
    const { mod, spawn } = await load('win32', {
      powershell: { stdout: '10|~|1|~|node.exe|~|node C:\\repo\\x.mjs\r\n' },
    });
    expect(mod.listProcesses()).toEqual([{ pid: 10, ppid: 1, name: 'node.exe', args: 'node C:\\repo\\x.mjs' }]);
    expect(String(spawn.mock.calls[0][1]?.[3])).toContain('Get-CimInstance Win32_Process');
    expect(spawn.mock.calls[0][2]).toMatchObject({ maxBuffer: 16 * 1024 * 1024 });
  });

  it('kills each process tree with taskkill /T /F, never process.kill', async () => {
    const { mod, calls } = await load('win32');
    mod.killProcesses([{ pid: 7 }, { pid: 8 }]);
    expect(calls()).toEqual([
      ['taskkill', ['/pid', '7', '/T', '/F']],
      ['taskkill', ['/pid', '8', '/T', '/F']],
    ]);
    expect(kill).not.toHaveBeenCalled();
  });

  it('treats a missing powershell as nothing to reclaim rather than a crash', async () => {
    const { mod } = await load('win32', { powershell: new Error('ENOENT') });
    expect(mod.findPortOwners(4200)).toEqual([]);
    expect(mod.listProcesses()).toEqual([]);
  });
});

describe('on macOS / Linux', () => {
  it('finds only LISTENING owners with lsof, so a client connection is never mistaken for the server', async () => {
    const { mod, calls } = await load('darwin', { lsof: { stdout: '321\n' } });
    expect(mod.findPortOwners(5173)).toEqual([{ pid: 321 }]);
    expect(calls()).toEqual([['lsof', ['-t', '-i:5173', '-sTCP:LISTEN']]]);
  });

  it('lists processes with ps, which gives the full argv the ownership rules read', async () => {
    const { mod, calls } = await load('linux', { ps: { stdout: '  10     1 /usr/bin/node /repo/x.mjs\n' } });
    expect(mod.listProcesses()).toEqual([{ pid: 10, ppid: 1, name: 'node', args: '/usr/bin/node /repo/x.mjs' }]);
    expect(calls()).toEqual([['ps', ['-A', '-o', 'pid=,ppid=,args=']]]);
  });

  it('kills with SIGKILL and shrugs off a process that is already gone', async () => {
    const { mod, spawn } = await load('linux');
    kill.mockImplementation((pid: number) => {
      if (pid === 8) throw Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' });
      return true;
    });
    expect(() => mod.killProcesses([{ pid: 8 }, { pid: 9 }])).not.toThrow();
    expect(kill.mock.calls).toEqual([[8, 'SIGKILL'], [9, 'SIGKILL']]);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('treats a missing lsof or ps (a slim container) as nothing to reclaim', async () => {
    const { mod } = await load('linux', { lsof: new Error('ENOENT'), ps: new Error('ENOENT') });
    expect(mod.findPortOwners(1)).toEqual([]);
    expect(mod.listProcesses()).toEqual([]);
  });
});

describe('reclaimPort', () => {
  const ROOT = '/work/repo';
  // 100 = nx's run-executor for this workspace; 200 = its demo server (relative
  // path, so only the parent names the repo); 201 = a child of the server;
  // 300 = somebody else's postgres.
  const PS = [
    '  100     1 node /work/repo/node_modules/nx/bin/run-executor.js',
    '  200   100 node apps/react-bootstrap-demo/server.mjs',
    '  201   200 node worker.js',
    '  300     1 postgres -D /var/lib/pg',
  ].join('\n');

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('does nothing, and lists no processes, when the port is free', async () => {
    const { mod, calls } = await load('linux', { lsof: { stdout: '' } });
    expect(mod.reclaimPort(4200, { workspaceRoot: ROOT })).toBe(0);
    expect(calls().map(([cmd]) => cmd)).toEqual(['lsof']);
  });

  it('kills this workspace\'s leftover and its descendants, deepest first, and returns the count', async () => {
    const { mod } = await load('linux', { lsof: { stdout: '200\n' }, ps: { stdout: PS } });
    expect(mod.reclaimPort(4200, { workspaceRoot: ROOT, label: 'react-demo' })).toBe(2);
    expect(kill.mock.calls).toEqual([[201, 'SIGKILL'], [200, 'SIGKILL']]);
    expect(vi.mocked(console.warn).mock.calls[0][0]).toMatch(
      /^\[react-demo\] port 4200 was held by a leftover from this workspace \(node:201, node:200\) — killing it\./,
    );
  });

  it('reports a stranger on the port and leaves it alone', async () => {
    const { mod } = await load('linux', { lsof: { stdout: '300\n' }, ps: { stdout: PS } });
    expect(mod.reclaimPort(4200, { workspaceRoot: ROOT })).toBe(0);
    expect(kill).not.toHaveBeenCalled();
    expect(vi.mocked(console.error).mock.calls[0][0]).toBe(
      '[dev-server] port 4200 is held by postgres (pid 300), which does not belong to this workspace — leaving it alone.',
    );
  });

  it('names a stranger by pid when its name is unknown', async () => {
    const { mod } = await load('linux', { lsof: { stdout: '999\n' }, ps: { stdout: PS } });
    mod.reclaimPort(4200, { workspaceRoot: ROOT });
    expect(vi.mocked(console.error).mock.calls[0][0]).toMatch(/held by pid 999 \(pid 999\)/);
  });
});

describe('reclaimPortAndWait', () => {
  const PS = '  100     1 node /work/repo/x.mjs\n';

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('returns at once when there was nothing to reclaim', async () => {
    const { mod, calls } = await load('linux', { lsof: { stdout: '' } });
    expect(await mod.reclaimPortAndWait(4200, { workspaceRoot: '/work/repo' })).toBe(0);
    expect(calls()).toHaveLength(1);
  });

  it('polls until the OS has actually released the socket after the kill', async () => {
    const owners = ['100\n', '100\n', ''];
    const { mod, calls } = await load('linux', {
      lsof: () => ({ stdout: owners.shift() ?? '' }),
      ps: { stdout: PS },
    });
    expect(await mod.reclaimPortAndWait(4200, { workspaceRoot: '/work/repo' })).toBe(1);
    expect(calls().filter(([cmd]) => cmd === 'lsof').length).toBeGreaterThanOrEqual(3);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('warns when the port is still held once the timeout runs out', async () => {
    const { mod } = await load('linux', { lsof: { stdout: '100\n' }, ps: { stdout: PS } });
    expect(await mod.reclaimPortAndWait(4200, { workspaceRoot: '/work/repo', label: 'api', timeoutMs: 150 })).toBe(1);
    expect(vi.mocked(console.error).mock.calls.at(-1)?.[0]).toBe(
      '[api] port 4200 is STILL held after the kill; binding will likely fail.',
    );
  });
});
