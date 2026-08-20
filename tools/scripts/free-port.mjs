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
//
// Side-effect-free on import: everything runs behind an isEntryPoint guard, so
// importing this never kills anything.

import { pathToFileURL } from 'node:url';
import { reclaimPortAndWait } from './lib/dev-processes.mjs';

/**
 * `[port, label]` positionals. `port` is NaN-or-non-positive when the argument
 * is missing or not a whole number, which is the only usage error there is.
 */
export function parseArgs(argv) {
  return {
    port: Number.parseInt(argv[0] ?? '', 10),
    label: argv[1] ?? 'free-port',
  };
}

export const isValidPort = (port) => Number.isInteger(port) && port > 0;

const isEntryPoint = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  const { port, label } = parseArgs(process.argv.slice(2));

  if (!isValidPort(port)) {
    console.error('[free-port] usage: node tools/scripts/free-port.mjs <port> [label]');
    process.exit(1);
  }

  // Waits for the socket to be released, not just the holder killed — the serve
  // this runs ahead of would otherwise still be able to hit EADDRINUSE.
  await reclaimPortAndWait(port, { label });
}
