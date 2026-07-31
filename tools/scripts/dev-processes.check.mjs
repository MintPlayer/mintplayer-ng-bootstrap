#!/usr/bin/env node
// Checks the dev-server leftover rules against process listings captured from
// all three platforms, so a Windows-only developer can still tell whether the
// macOS/Linux branches are right.
//
//   node tools/scripts/dev-processes.check.mjs
//
// There is no test target covering tools/, so this is a standalone script rather
// than a spec. It imports both modules, which are side-effect-free on import by
// design (their work sits behind an isEntryPoint guard) — an import that killed
// your running dev server would be a nasty surprise. It has been.

import {
  selectPortLeftovers,
  withDescendants,
  parseWindowsProcesses,
  parsePosixProcesses,
  parsePids,
} from './lib/dev-processes.mjs';
import { selectLeftovers } from './serve-api.mjs';

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}` +
      (ok ? '' : `\n   got      ${JSON.stringify(actual)}\n   expected ${JSON.stringify(expected)}`),
  );
};

// ===========================================================================
// API rules (serve-api.mjs): recognised by csproj / bin path, no port involved
// ===========================================================================

const winApi = parseWindowsProcesses(
  [
    '4|~|0|~|System|~|',
    '9999|~|1|~|explorer.exe|~|C:\\WINDOWS\\Explorer.EXE',
    // the leftover chain, exactly as Win32_Process reported it in the session
    // where this was built
    '15324|~|12192|~|dotnet.exe|~|"C:\\Program Files\\dotnet\\dotnet.exe" watch --project apps/api/Api.csproj run --urls http://localhost:5000',
    '31352|~|15324|~|dotnet.exe|~|"C:\\Program Files\\dotnet\\dotnet.exe" "C:\\Program Files\\dotnet\\sdk\\10.0.400\\DotnetTools\\dotnet-watch\\tools\\net10.0\\any\\dotnet-watch.dll" --project apps/api/Api.csproj run',
    '31312|~|31352|~|dotnet.exe|~|"C:\\Program Files\\dotnet\\dotnet.exe" run --no-build --framework net10.0 --project apps/api/Api.csproj --urls http://localhost:5000',
    '31492|~|31312|~|Api.exe|~|"C:\\Repos\\mintplayer-ng-bootstrap\\apps\\api\\bin\\Debug\\net10.0\\Api.exe" --urls http://localhost:5000',
    '8888|~|1|~|node.exe|~|node C:\\other\\project\\server.js --port 5000',
  ].join('\r\n'),
);

check('api/windows: parses every line', winApi.length, 7);
check(
  'api/windows: whole chain, apphost first (deepest) and the watch runner last',
  selectLeftovers(winApi, 'C:\\Repos\\mintplayer-ng-bootstrap').map((p) => p.pid),
  [31492, 31312, 31352, 15324],
);
check(
  'api/windows: an unrelated node server on 5000 is not ours',
  selectLeftovers(winApi, 'C:\\Repos\\mintplayer-ng-bootstrap').some((p) => p.pid === 8888),
  false,
);

const linuxApi = parsePosixProcesses(
  [
    '    1     0 /sbin/init',
    ' 4210  4180 /usr/bin/dotnet watch --project apps/api/Api.csproj run --urls http://localhost:5000',
    ' 4230  4210 /usr/bin/dotnet /usr/share/dotnet/sdk/10.0.400/DotnetTools/dotnet-watch/dotnet-watch.dll --project apps/api/Api.csproj run',
    ' 4250  4230 /home/piet/mintplayer-ng-bootstrap/apps/api/bin/Debug/net10.0/Api --urls http://localhost:5000',
    ' 5000  4999 /usr/bin/node /srv/unrelated/server.js',
  ].join('\n'),
);

check('api/linux: parses pid/ppid/args', linuxApi.length, 5);
check('api/linux: derives a name from argv[0]', linuxApi[3].name, 'Api');
check(
  'api/linux: whole chain, deepest first',
  selectLeftovers(linuxApi, '/home/piet/mintplayer-ng-bootstrap').map((p) => p.pid),
  [4250, 4230, 4210],
);

const macApi = parsePosixProcesses(
  [
    '    1     0 /sbin/launchd',
    '  812   780 /usr/local/share/dotnet/dotnet watch --project apps/api/Api.csproj run --urls http://localhost:5000',
    '  840   812 /usr/local/share/dotnet/dotnet /usr/local/share/dotnet/sdk/10.0.400/DotnetTools/dotnet-watch/dotnet-watch.dll --project apps/api/Api.csproj run',
    '  865   840 /Users/piet/repos/mintplayer-ng-bootstrap/apps/api/bin/Debug/net10.0/Api --urls http://localhost:5000',
  ].join('\n'),
);

check(
  'api/macos: whole chain, deepest first',
  selectLeftovers(macApi, '/Users/piet/repos/mintplayer-ng-bootstrap').map((p) => p.pid),
  [865, 840, 812],
);
check(
  'api: an apphost from a DIFFERENT checkout is not matched by the bin rule',
  selectLeftovers(
    parsePosixProcesses(' 7000  6999 /home/piet/other-clone/apps/api/bin/Debug/net10.0/Api --urls http://localhost:5000'),
    '/home/piet/mintplayer-ng-bootstrap',
  ).length,
  0,
);

// ===========================================================================
// Demo-server rules (lib/dev-processes.mjs): recognised by PORT + ANCESTRY
// ===========================================================================

// The real ancestry from `npm start`, captured on Windows. Note the listener's
// own command line is RELATIVE (`node apps/react-bootstrap-demo/server.mjs`) —
// only its nx parent carries the workspace path, which is exactly why ownership
// is decided by walking up.
const winDemo = parseWindowsProcesses(
  [
    '2720|~|1|~|bash.exe|~|"C:\\Program Files\\Git\\usr\\bin\\bash.exe" /c/nvm4w/nodejs/npm start',
    '30432|~|2720|~|node.exe|~|C:\\nvm4w\\nodejs\\node.exe C:\\nvm4w\\nodejs/node_modules/npm/bin/npm-cli.js start',
    '3712|~|30432|~|cmd.exe|~|C:\\WINDOWS\\system32\\cmd.exe /d /s /c nx run-many -t serve -p ng-bootstrap-demo,react-bootstrap-demo,vue-bootstrap-demo',
    '21732|~|3712|~|node.exe|~|"node" "C:\\Repos\\mintplayer-ng-bootstrap\\node_modules\\.bin\\..\\nx\\dist\\bin\\nx.js" run-many',
    '7964|~|21732|~|cmd.exe|~|C:\\WINDOWS\\system32\\cmd.exe /d /s /c "node apps/react-bootstrap-demo/server.mjs"',
    '16148|~|7964|~|node.exe|~|node  apps/react-bootstrap-demo/server.mjs',
    // Angular: the run-executor process IS the listener on 4200
    '6212|~|21732|~|node.exe|~|C:\\nvm4w\\nodejs\\node.exe C:\\Repos\\mintplayer-ng-bootstrap\\node_modules\\nx\\dist\\bin\\run-executor.js',
    // somebody else entirely, also on a 4xxx port
    '5555|~|1|~|node.exe|~|node C:\\other\\thing\\dev-server.js',
  ].join('\r\n'),
);

const WS = 'C:\\Repos\\mintplayer-ng-bootstrap';

check(
  'demo/windows: the react listener is ours via its nx PARENT, not its own args',
  selectPortLeftovers({ owners: parsePids('16148'), processes: winDemo, workspaceRoot: WS, selfPid: 4 })
    .ours.map((p) => p.pid),
  [16148],
);
check(
  'demo/windows: the Angular run-executor listener is ours',
  selectPortLeftovers({ owners: parsePids('6212'), processes: winDemo, workspaceRoot: WS, selfPid: 4 })
    .ours.map((p) => p.pid),
  [6212],
);
check(
  'demo/windows: a stranger on the port is reported, never killed',
  selectPortLeftovers({ owners: parsePids('5555'), processes: winDemo, workspaceRoot: WS, selfPid: 4 }),
  { ours: [], foreign: [{ pid: 5555, ppid: 1, name: 'node.exe', args: 'node C:\\other\\thing\\dev-server.js' }] },
);
check(
  'demo: we never kill ourselves or our own ancestors',
  // pretend WE are the react listener asking to reclaim its own port
  selectPortLeftovers({ owners: parsePids('16148'), processes: winDemo, workspaceRoot: WS, selfPid: 16148 }).ours,
  [],
);
check(
  'demo: an ancestor of ours is excluded too (the nx parent, when we are its child)',
  selectPortLeftovers({ owners: parsePids('21732'), processes: winDemo, workspaceRoot: WS, selfPid: 16148 }).ours,
  [],
);

// A listener WITH children (a wrapper that spawned the real server): the whole
// subtree goes, deepest first, so a supervisor cannot respawn what we just killed.
const withKids = parsePosixProcesses(
  [
    ' 100    1 /usr/bin/node /home/piet/mintplayer-ng-bootstrap/node_modules/nx/dist/bin/run-executor.js',
    ' 200  100 /bin/sh -c node apps/vue-bootstrap-demo/server.mjs',
    ' 300  200 /usr/bin/node apps/vue-bootstrap-demo/server.mjs',
    ' 400  300 /usr/bin/node --some-worker',
  ].join('\n'),
);
check(
  'demo/posix: owner + descendants, deepest first',
  selectPortLeftovers({
    owners: parsePids('200'),
    processes: withKids,
    workspaceRoot: '/home/piet/mintplayer-ng-bootstrap',
    selfPid: 1,
  }).ours.map((p) => p.pid),
  [400, 300, 200],
);
check(
  'withDescendants: tags depth relative to the root',
  withDescendants({ pid: 200, ppid: 100 }, withKids).map((p) => [p.pid, p.depth]),
  [[200, 0], [300, 1], [400, 2]],
);
check('parsePids: ignores noise', parsePids('  12 \n\nnot-a-pid\n 34 \n').map((p) => p.pid), [12, 34]);
check('findPortOwners-style empty input', parsePids(''), []);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
