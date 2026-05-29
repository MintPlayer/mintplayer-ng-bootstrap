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
import { createRequire } from 'node:module';

const isWindows = platform() === 'win32';
const isCI = !!process.env.CI;

const dotnetArgs = isCI
  ? ['run', '--project', 'apps/api/Api.csproj', '--urls', 'http://localhost:5000']
  : ['watch', '--project', 'apps/api/Api.csproj', 'run', '--urls', 'http://localhost:5000'];

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
