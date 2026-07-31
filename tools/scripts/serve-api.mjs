#!/usr/bin/env node
// Launches the ASP.NET Core API and tears down the entire child-process tree
// when this script goes away — Ctrl+C, Ctrl+Break, or nx hard-killing the task.
//
// nx:run-commands does not propagate signals to grandchildren, and on Windows
// nx frequently terminates this wrapper with TerminateProcess, which delivers
// no catchable signal at all — so a signal-handler-only teardown is skipped and
// the `dotnet watch` → apphost (`Api.exe`) subtree is orphaned, locking
// `bin/.../Api.exe` and holding port 5000.
//
// Teardown strategy, per-platform:
//   * Windows — attach the child to a Job Object with KILL_ON_JOB_CLOSE. This
//     process holds the only handle to the job, so when it exits *for any
//     reason* (including TerminateProcess) the OS closes the handle and kills
//     every process in the job. Bulletproof, signal-independent. If the FFI is
//     unavailable we fall back to taskkill in the signal handlers.
//   * Linux / macOS — put the child in its own process group (detached) and
//     signal the whole group with process.kill(-pid). Unchanged, proven path.
//
// The job object covers the wrapper *dying*. It cannot cover the wrapper being
// LEFT ALIVE: if the target that depends on `api:serve` fails (say the Angular
// dev-server finds its port taken), nx exits without cancelling the continuous
// dependency task it already started, so this wrapper keeps running and the API
// keeps holding `bin/.../Api.dll` and port 5000. The next `npm start` then fails
// its API build with MSB3027 "file is locked by Api.exe". Hence `killLeftoverApi`
// below: a leftover of OUR OWN is cleaned up on the way in, rather than left for
// the developer to hunt down with taskkill.
//
// The process listing, the port lookup and the tree-kill live in
// `lib/dev-processes.mjs`, shared with the demo dev-servers (which need the
// reclaim but NOT the job object — they have no descendants to reap; see that
// file's header). Only the rules for recognising THIS API's processes are here.
//
// Those rules are pure and exported; `dev-processes.check.mjs` next door
// exercises them, and the shared ownership rules, against captured
// Windows/Linux/macOS process listings. Run it after touching either:
// `node tools/scripts/dev-processes.check.mjs`.
//
// Locally we use `dotnet watch run` for hot-reload during dev. In CI nothing
// changes between boot and shutdown, so we use a plain `dotnet run` instead:
//   - skips the file-watcher overhead
//   - skips the static-web-assets accountancy that produces the
//     "Failed to read obj\Debug/net10.0/staticwebassets.development.json"
//     noise during the first-time build race
//   - exits more deterministically on SIGTERM, since there's no restart loop
//     to drain

import { spawn, spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { listProcesses, killProcesses } from './lib/dev-processes.mjs';

const isWindows = platform() === 'win32';
const isCI = !!process.env.CI;

const API_PORT = 5000;
const API_URL = `http://localhost:${API_PORT}`;

const dotnetArgs = isCI
  ? ['run', '--project', 'apps/api/Api.csproj', '--urls', API_URL]
  : ['watch', '--project', 'apps/api/Api.csproj', 'run', '--urls', API_URL];

// Best-effort Windows Job Object. Returns { assign(pid), terminate() } or null.
// Windows-only: the FFI module is never required on Linux/macOS.
function setupWindowsJob() {
  try {
    const require = createRequire(import.meta.url);
    const koffi = require('koffi');
    const k32 = koffi.load('kernel32.dll');

    // JOBOBJECT_EXTENDED_LIMIT_INFORMATION (+ its nested structs). koffi
    // computes the native (x64) layout/padding from these field types.
    koffi.struct('JOBOBJECT_BASIC_LIMIT_INFORMATION', {
      PerProcessUserTimeLimit: 'int64',
      PerJobUserTimeLimit: 'int64',
      LimitFlags: 'uint32',
      MinimumWorkingSetSize: 'size_t',
      MaximumWorkingSetSize: 'size_t',
      ActiveProcessLimit: 'uint32',
      Affinity: 'size_t',
      PriorityClass: 'uint32',
      SchedulingClass: 'uint32',
    });
    koffi.struct('IO_COUNTERS', {
      ReadOperationCount: 'uint64',
      WriteOperationCount: 'uint64',
      OtherOperationCount: 'uint64',
      ReadTransferCount: 'uint64',
      WriteTransferCount: 'uint64',
      OtherTransferCount: 'uint64',
    });
    koffi.struct('JOBOBJECT_EXTENDED_LIMIT_INFORMATION', {
      BasicLimitInformation: 'JOBOBJECT_BASIC_LIMIT_INFORMATION',
      IoInfo: 'IO_COUNTERS',
      ProcessMemoryLimit: 'size_t',
      JobMemoryLimit: 'size_t',
      PeakProcessMemoryUsed: 'size_t',
      PeakJobMemoryUsed: 'size_t',
    });

    const CreateJobObjectW = k32.func('void* CreateJobObjectW(void* attrs, void* name)');
    const SetInformationJobObject = k32.func(
      'int SetInformationJobObject(void* job, int infoClass, JOBOBJECT_EXTENDED_LIMIT_INFORMATION* info, uint32 cb)',
    );
    const AssignProcessToJobObject = k32.func('int AssignProcessToJobObject(void* job, void* process)');
    const OpenProcess = k32.func('void* OpenProcess(uint32 access, int inherit, uint32 pid)');
    const TerminateJobObject = k32.func('int TerminateJobObject(void* job, uint32 exitCode)');
    const CloseHandle = k32.func('int CloseHandle(void* handle)');

    const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
    const JobObjectExtendedLimitInformation = 9;
    const PROCESS_TERMINATE = 0x0001;
    const PROCESS_SET_QUOTA = 0x0100;

    const job = CreateJobObjectW(null, null);
    if (!job) throw new Error('CreateJobObjectW returned null');

    const ok = SetInformationJobObject(
      job,
      JobObjectExtendedLimitInformation,
      { BasicLimitInformation: { LimitFlags: JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE } },
      koffi.sizeof('JOBOBJECT_EXTENDED_LIMIT_INFORMATION'),
    );
    if (!ok) {
      CloseHandle(job);
      throw new Error('SetInformationJobObject failed');
    }

    return {
      assign(pid) {
        const handle = OpenProcess(PROCESS_TERMINATE | PROCESS_SET_QUOTA, 0, pid);
        if (!handle) throw new Error(`OpenProcess failed for pid ${pid}`);
        const assigned = AssignProcessToJobObject(job, handle);
        CloseHandle(handle);
        if (!assigned) throw new Error('AssignProcessToJobObject failed');
      },
      terminate() {
        TerminateJobObject(job, 1);
      },
    };
  } catch (err) {
    console.warn(`[serve-api] job-object unavailable, using taskkill fallback: ${err.message}`);
    return null;
  }
}

/**
 * Kill a LEFTOVER instance of this repo's own API before starting a new one.
 *
 * All three platforms need this, for the same reason with different symptoms.
 * If the target that depends on `api:serve` fails (say the Angular dev-server
 * finds its port taken), nx exits without cancelling the continuous dependency
 * task it already started, so the wrapper below keeps running and the API keeps
 * holding port 5000. On Windows it also keeps a WRITE LOCK on
 * `bin/.../Api.dll`, so the next `npm start` fails its build outright with
 * MSB3027 "file is locked by Api.exe"; on macOS/Linux the binary is replaceable
 * but Kestrel still cannot bind, so the API silently never comes up. Same
 * leftover, same fix — hence no platform condition here, only in HOW the
 * process list is read and how a tree is killed.
 *
 * Identified by two repo-scoped signals rather than by port ownership: the
 * runners carry `--project apps/api/Api.csproj` in their command line, and the
 * apphost's image path is under this repo's `apps/api/bin/`. That is narrower
 * than "whatever holds 5000" — a foreign service on the port is left alone for
 * Kestrel to complain about, because stealing a port from a process you cannot
 * identify is how a dev tool eats someone's database. It is also broader in the
 * one way that matters: it still finds a leftover whose listener has already
 * died but whose DLL lock has not.
 */
function killLeftoverApi() {
  const leftovers = selectLeftovers(listProcesses(), process.cwd());
  if (leftovers.length === 0) return;

  console.warn(
    `[serve-api] found ${leftovers.length} leftover API process(es) from this repo ` +
      `(${leftovers.map((p) => `${p.name}:${p.pid}`).join(', ')}) — killing them. This happens ` +
      `when a previous serve was interrupted in a way that left the wrapper running.`,
  );

  // Deepest first (selectLeftovers sorts them). The runner (`dotnet watch`)
  // RESTARTS its child, so killing the apphost alone just hands the port straight
  // back; killing children before their runner closes the window entirely.
  killProcesses(leftovers);
}

/**
 * Pure: pick this repo's API processes out of a process list, deepest child
 * first. Split out from the platform I/O so the matching rules can be reasoned
 * about — and checked — without spawning anything.
 */
export function selectLeftovers(processes, cwd) {
  const slash = (value) => (value ?? '').replace(/\\/g, '/').toLowerCase();
  const projectRef = 'apps/api/api.csproj';
  const binRef = `${slash(cwd)}/apps/api/bin/`;

  const matches = processes.filter((proc) => {
    if (proc.pid === process.pid) return false; // never ourselves
    const args = slash(proc.args);
    return args.includes(projectRef) || args.includes(binRef);
  });

  // Depth = how many of the OTHER matches are ancestors of this one, so the
  // apphost sorts after its runner regardless of the list order we were given.
  const byPid = new Map(processes.map((proc) => [proc.pid, proc]));
  const matchedPids = new Set(matches.map((proc) => proc.pid));
  const depthOf = (proc) => {
    let depth = 0;
    let current = byPid.get(proc.ppid);
    const seen = new Set([proc.pid]);
    while (current && !seen.has(current.pid)) {
      seen.add(current.pid);
      if (matchedPids.has(current.pid)) depth++;
      current = byPid.get(current.ppid);
    }
    return depth;
  };

  return matches
    .map((proc) => ({ ...proc, depth: depthOf(proc) }))
    .sort((a, b) => b.depth - a.depth);
}

/**
 * True only when this file was RUN, not imported. The matching rules above are
 * exported for `dev-processes.check.mjs`, and an import that kills the API you
 * are currently running is a trap — so every side effect lives behind this guard.
 */
const isEntryPoint =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) main();

function main() {
killLeftoverApi();

const job = isWindows ? setupWindowsJob() : null;

const child = spawn('dotnet', dotnetArgs, {
  stdio: 'inherit',
  // shell:true on Windows so PATHEXT resolves `dotnet` → `dotnet.exe`. The
  // job (when present) captures the cmd.exe child and every process it spawns,
  // since job membership is inherited by descendants. On Unix we put the child
  // in its own process group so a single signal to -pid reaches every member.
  shell: isWindows,
  detached: !isWindows,
});

// Attach the freshly-spawned process to the job before it spawns dotnet/Kestrel,
// so the whole subtree inherits job membership.
if (job && child.pid != null) {
  try {
    job.assign(child.pid);
  } catch (err) {
    console.warn(`[serve-api] failed to assign child to job, using taskkill fallback: ${err.message}`);
    job.terminate = null; // disable job teardown; fall through to taskkill
  }
}

let killed = false;

function killTree() {
  if (killed || child.pid == null) return;
  killed = true;

  // Preferred Windows path: terminate the whole job in one call.
  if (job && job.terminate) {
    job.terminate();
    return;
  }

  if (isWindows) {
    // spawnSync (not spawn) — taskkill must FINISH before this Node process
    // exits, otherwise the kill request gets orphaned and dotnet/Kestrel keep
    // holding :5000.
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      try { child.kill('SIGTERM'); } catch { /* already gone */ }
    }
  }
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) {
  process.on(sig, () => {
    killTree();
    // After killing the tree, exit explicitly. Without this, Node hangs
    // waiting for child.on('exit') to fire — which it eventually does, but
    // only after the kill propagates, leaving the user staring at a dead
    // terminal for a few extra seconds.
    process.exit(0);
  });
}
process.on('exit', killTree);

child.on('error', (err) => {
  console.error('[serve-api] failed to spawn dotnet:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : code ?? 0);
});
}
