// Shared process/port plumbing for the workspace's dev servers.
//
// WHY THIS EXISTS
//
// Windows has no POSIX process groups: killing a parent does not kill its
// children. nx also terminates its task processes with TerminateProcess, which
// delivers no catchable signal, and it does not cancel a *continuous* dependency
// task when the target that depends on it fails. Put together, an interrupted
// `npm start` routinely leaves dev servers alive holding their ports — the next
// start then fails with EADDRINUSE, or (for the API) MSB3027 "file is locked by
// Api.exe", and the developer is left hunting PIDs.
//
// PR #376 addressed one half of this for the API with a Windows Job Object
// (`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` in `serve-api.mjs`): when that wrapper
// dies for any reason, its `dotnet watch` → apphost subtree dies with it. That
// remains the right tool THERE, because the wrapper has descendants.
//
// It is the wrong tool for the demo servers, which is why they never got it: the
// React/Vue servers run Vite in middleware mode IN-PROCESS and the Angular
// dev-server runs inside nx's own run-executor process. There are no descendants
// to reap, and the process that needs killing is the one that would have owned
// the job. A job object cannot make a process kill itself.
//
// So the demo servers get the other half instead — the same reclaim-on-startup
// approach `serve-api.mjs` uses: whoever is squatting on my port, if it belongs
// to THIS workspace, is a leftover of mine and gets cleaned up.
//
// Ownership is decided by ancestry, not by the owner's own command line: nx runs
// `node apps/react-bootstrap-demo/server.mjs` with a RELATIVE path, so the
// listener itself carries no repo path, while its nx run-executor parent does.
// A process on the port whose ancestry never mentions this workspace is somebody
// else's and is reported, never killed.

import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';

const isWindows = platform() === 'win32';

const slash = (value) => (value ?? '').replace(/\\/g, '/').toLowerCase();

/**
 * Free `port` of any leftover belonging to this workspace. Returns the number of
 * processes killed, so a caller can decide whether to wait for the port.
 */
export function reclaimPort(port, { workspaceRoot = process.cwd(), label = 'dev-server' } = {}) {
  const owners = findPortOwners(port);
  if (owners.length === 0) return 0;

  const processes = listProcesses();
  const { ours, foreign } = selectPortLeftovers({ owners, processes, workspaceRoot });

  for (const proc of foreign) {
    console.error(
      `[${label}] port ${port} is held by ${proc.name || 'pid ' + proc.pid} (pid ${proc.pid}), ` +
        `which does not belong to this workspace — leaving it alone.`,
    );
  }

  if (ours.length === 0) return 0;

  console.warn(
    `[${label}] port ${port} was held by a leftover from this workspace ` +
      `(${ours.map((p) => `${p.name || 'pid'}:${p.pid}`).join(', ')}) — killing it. This happens ` +
      `when a previous serve was interrupted in a way that left the process running.`,
  );
  killProcesses(ours);
  return ours.length;
}

/**
 * Reclaim `port`, then wait until the OS has actually released the socket.
 *
 * The release is asynchronous: the holder's process object is gone long before
 * its listening socket is, so a bind issued straight after the kill can still
 * take EADDRINUSE. Polling until it is genuinely free beats sleeping a hopeful
 * fixed amount, and returns immediately in the common case where there was
 * nothing to reclaim.
 */
export async function reclaimPortAndWait(port, options = {}) {
  const killed = reclaimPort(port, options);
  if (killed === 0) return 0;

  const label = options.label ?? 'dev-server';
  const deadline = Date.now() + (options.timeoutMs ?? 5000);
  while (Date.now() < deadline && findPortOwners(port).length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (findPortOwners(port).length > 0) {
    console.error(`[${label}] port ${port} is STILL held after the kill; binding will likely fail.`);
  }
  return killed;
}

/**
 * Pure: of the processes holding a port, which are this workspace's (with their
 * descendants, deepest first) and which are strangers.
 *
 * Deepest first because a parent may respawn a child it is supervising; taking
 * the children out first closes that window. Our own process and our own
 * ancestors are never candidates — a preflight that kills its own caller would
 * be a memorable bug.
 */
export function selectPortLeftovers({ owners, processes, workspaceRoot, selfPid = process.pid }) {
  const root = slash(workspaceRoot);
  const byPid = new Map(processes.map((proc) => [proc.pid, proc]));
  const resolved = owners
    .map((owner) => byPid.get(owner.pid) ?? { ...owner, ppid: owner.ppid ?? 0, args: owner.args ?? '' })
    .filter(Boolean);

  const ancestorsOf = (pid) => {
    const chain = [];
    let current = byPid.get(pid);
    const seen = new Set();
    while (current && !seen.has(current.pid)) {
      seen.add(current.pid);
      chain.push(current);
      current = byPid.get(current.ppid);
    }
    return chain;
  };

  const selfChain = new Set(ancestorsOf(selfPid).map((proc) => proc.pid));
  const belongsHere = (proc) =>
    ancestorsOf(proc.pid).some((ancestor) => slash(ancestor.args).includes(root)) ||
    slash(proc.args).includes(root);

  const ours = [];
  const foreign = [];
  for (const owner of resolved) {
    if (selfChain.has(owner.pid)) continue;
    (belongsHere(owner) ? ours : foreign).push(owner);
  }

  const targets = new Map();
  for (const owner of ours) {
    for (const proc of withDescendants(owner, processes)) {
      if (selfChain.has(proc.pid)) continue;
      const existing = targets.get(proc.pid);
      if (!existing || proc.depth > existing.depth) targets.set(proc.pid, proc);
    }
  }

  return {
    ours: [...targets.values()].sort((a, b) => b.depth - a.depth),
    foreign,
  };
}

/** Pure: `root` plus every descendant, each tagged with its depth below root. */
export function withDescendants(root, processes) {
  const children = new Map();
  for (const proc of processes) {
    const bucket = children.get(proc.ppid);
    if (bucket) bucket.push(proc);
    else children.set(proc.ppid, [proc]);
  }
  const out = [{ ...root, depth: 0 }];
  const queue = [{ pid: root.pid, depth: 0 }];
  const seen = new Set([root.pid]);
  while (queue.length > 0) {
    const { pid, depth } = queue.shift();
    for (const child of children.get(pid) ?? []) {
      if (seen.has(child.pid)) continue;
      seen.add(child.pid);
      out.push({ ...child, depth: depth + 1 });
      queue.push({ pid: child.pid, depth: depth + 1 });
    }
  }
  return out;
}

/** Kill the given processes. `/T` on Windows also sweeps anything we missed. */
export function killProcesses(procs) {
  for (const proc of procs) {
    if (isWindows) {
      spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(proc.pid, 'SIGKILL');
      } catch {
        /* already gone, or not ours to kill */
      }
    }
  }
}

/** `[{ pid }]` for whatever is LISTENING on `port`. Best effort. */
export function findPortOwners(port) {
  try {
    if (isWindows) {
      const script =
        `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ` +
        `Select-Object -ExpandProperty OwningProcess -Unique`;
      const out = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
        encoding: 'utf8',
      });
      return parsePids(out.stdout);
    }
    // -sTCP:LISTEN so a mere client connection to the port is never mistaken for
    // the server holding it.
    const out = spawnSync('lsof', ['-t', `-i:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
    return parsePids(out.stdout);
  } catch {
    // No powershell/lsof (a slim container, say) — then we simply do not reclaim.
    return [];
  }
}

export function parsePids(stdout) {
  return (stdout ?? '')
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0)
    .map((pid) => ({ pid }));
}

/** `[{ pid, ppid, name, args }]` for every process we can see. Best effort. */
export function listProcesses() {
  try {
    if (isWindows) {
      // `|~|` as the delimiter: a command line can contain commas, semicolons,
      // tabs and quotes, but not this.
      const script =
        `Get-CimInstance Win32_Process | ForEach-Object { ` +
        `"$($_.ProcessId)|~|$($_.ParentProcessId)|~|$($_.Name)|~|$($_.CommandLine)" }`;
      const out = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      });
      return parseWindowsProcesses(out.stdout);
    }
    // POSIX-portable on both Linux (procps) and macOS, and gives the full argv,
    // which is what the ownership rules read.
    const out = spawnSync('ps', ['-A', '-o', 'pid=,ppid=,args='], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    return parsePosixProcesses(out.stdout);
  } catch {
    return [];
  }
}

export function parseWindowsProcesses(stdout) {
  return (stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.split('|~|'))
    .filter((parts) => parts.length >= 4)
    .map(([pid, ppid, name, ...rest]) => ({
      pid: Number.parseInt(pid, 10),
      ppid: Number.parseInt(ppid, 10),
      name: (name ?? '').trim(),
      args: rest.join('|~|').trim(),
    }))
    .filter((proc) => Number.isInteger(proc.pid));
}

export function parsePosixProcesses(stdout) {
  return (stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
    .filter(Boolean)
    .map(([, pid, ppid, args]) => ({
      pid: Number.parseInt(pid, 10),
      ppid: Number.parseInt(ppid, 10),
      // No exe path from `ps`, and none is needed: argv[0] IS the path.
      name: (args.split(/\s+/)[0] ?? '').split('/').pop() ?? '',
      args,
    }));
}
