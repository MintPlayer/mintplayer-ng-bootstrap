#!/usr/bin/env node
// Frees a dev-server port of leftovers from THIS workspace, then exits.
//
//   node tools/scripts/free-port.mjs 4200 [label]
//
// For dev servers that have no wrapper script of their own to do it — the
// Angular demo's `serve` is nx's `@angular/build:dev-server` executor, which
// listens from inside nx's run-executor process, so there is nowhere to hook a
// startup check except a `dependsOn` task like this one.
//
// A no-op unless something is actually squatting on the port, and it never
// touches a process whose ancestry does not lead back to this workspace — see
// lib/dev-processes.mjs for why ancestry rather than the command line.

import { reclaimPortAndWait } from './lib/dev-processes.mjs';

const port = Number.parseInt(process.argv[2] ?? '', 10);
const label = process.argv[3] ?? 'free-port';

if (!Number.isInteger(port) || port <= 0) {
  console.error('[free-port] usage: node tools/scripts/free-port.mjs <port> [label]');
  process.exit(1);
}

// Waits for the socket to be released, not just the holder killed — the serve
// this runs ahead of would otherwise still be able to hit EADDRINUSE.
await reclaimPortAndWait(port, { label });
