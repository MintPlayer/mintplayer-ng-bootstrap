#!/usr/bin/env node
// Launches the ASP.NET Core API via `dotnet watch` and tears down the entire
// child-process tree when this script is interrupted (Ctrl+C, Ctrl+Break, or
// nx killing it). Works around nx:run-commands not propagating SIGINT to
// grandchildren on Windows — without this, aborting `nx serve` left
// `dotnet watch` (and its inner `dotnet run` + Kestrel) holding port 5000.

import { spawn, spawnSync } from 'node:child_process';
import { platform } from 'node:os';

const isWindows = platform() === 'win32';

const child = spawn(
  'dotnet',
  ['watch', '--project', 'apps/api/Api.csproj', 'run', '--urls', 'http://localhost:5000'],
  {
    stdio: 'inherit',
    // shell:true on Windows so PATHEXT resolves `dotnet` → `dotnet.exe`.
    // On Unix we put the child in its own process group so a single signal
    // to -pid reaches every descendant.
    shell: isWindows,
    detached: !isWindows,
  }
);

let killed = false;

function killTree() {
  if (killed || child.pid == null) return;
  killed = true;
  if (isWindows) {
    // spawnSync (not spawn) — taskkill needs to FINISH before this
    // Node process exits, otherwise the kill request gets orphaned
    // and dotnet/Kestrel keep holding :5000. The previous async spawn
    // raced against `child.on('exit') → process.exit()` and routinely
    // lost when nx run-many tore the task tree down hard.
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
    // waiting for child.on('exit') to fire — which it eventually does,
    // but only after taskkill propagates, leaving the user staring at
    // a dead terminal for a few extra seconds.
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
