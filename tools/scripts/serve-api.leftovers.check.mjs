#!/usr/bin/env node
// Checks serve-api.mjs's leftover-detection rules against process listings
// captured from all three platforms, so the Windows-only developer can still
// tell whether the macOS/Linux branches are right.
//
//   node tools/scripts/serve-api.leftovers.check.mjs
//
// There is no test target covering tools/, so this is a standalone script rather
// than a spec. It imports serve-api.mjs, which is side-effect-free on import by
// design (its work is behind an isEntryPoint guard) — an import that killed your
// running API would be a nasty surprise.
import {
  selectLeftovers,
  parseWindowsProcesses,
  parsePosixProcesses,
} from './serve-api.mjs';

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n   got      ${JSON.stringify(actual)}\n   expected ${JSON.stringify(expected)}`}`);
};

// ---------- Windows ----------
const winStdout = [
  '4|~|0|~|System|~|',
  '9999|~|1|~|explorer.exe|~|C:\\WINDOWS\\Explorer.EXE',
  // the leftover chain, exactly as Win32_Process reported it in this session
  '15324|~|12192|~|dotnet.exe|~|"C:\\Program Files\\dotnet\\dotnet.exe" watch --project apps/api/Api.csproj run --urls http://localhost:5000',
  '31352|~|15324|~|dotnet.exe|~|"C:\\Program Files\\dotnet\\dotnet.exe" "C:\\Program Files\\dotnet\\sdk\\10.0.400\\DotnetTools\\dotnet-watch\\tools\\net10.0\\any\\dotnet-watch.dll" --project apps/api/Api.csproj run',
  '31312|~|31352|~|dotnet.exe|~|"C:\\Program Files\\dotnet\\dotnet.exe" run --no-build --framework net10.0 --project apps/api/Api.csproj --urls http://localhost:5000',
  '31492|~|31312|~|Api.exe|~|"C:\\Repos\\mintplayer-ng-bootstrap\\apps\\api\\bin\\Debug\\net10.0\\Api.exe" --urls http://localhost:5000',
  // must NOT match: a different repo checkout is out of scope for the bin rule,
  // and an unrelated service on the same port is not ours at all.
  '8888|~|1|~|node.exe|~|node C:\\other\\project\\server.js --port 5000',
].join('\r\n');

const winProcs = parseWindowsProcesses(winStdout);
check('windows: parses every line', winProcs.length, 7);
const winPicked = selectLeftovers(winProcs, 'C:\\Repos\\mintplayer-ng-bootstrap');
check(
  'windows: picks the 4-process chain, apphost FIRST (deepest) and watch LAST',
  winPicked.map((p) => p.pid),
  [31492, 31312, 31352, 15324],
);
check('windows: leaves the unrelated node server alone', winPicked.some((p) => p.pid === 8888), false);

// ---------- Linux ----------
const linuxStdout = [
  '    1     0 /sbin/init',
  ' 4210  4180 /usr/bin/dotnet watch --project apps/api/Api.csproj run --urls http://localhost:5000',
  ' 4230  4210 /usr/bin/dotnet /usr/share/dotnet/sdk/10.0.400/DotnetTools/dotnet-watch/dotnet-watch.dll --project apps/api/Api.csproj run',
  ' 4250  4230 /home/piet/mintplayer-ng-bootstrap/apps/api/bin/Debug/net10.0/Api --urls http://localhost:5000',
  ' 5000  4999 /usr/bin/node /srv/unrelated/server.js',
].join('\n');

const linuxProcs = parsePosixProcesses(linuxStdout);
check('linux: parses pid/ppid/args', linuxProcs.length, 5);
check('linux: derives a name from argv[0]', linuxProcs[3].name, 'Api');
const linuxPicked = selectLeftovers(linuxProcs, '/home/piet/mintplayer-ng-bootstrap');
check(
  'linux: picks the chain, deepest first',
  linuxPicked.map((p) => p.pid),
  [4250, 4230, 4210],
);
check('linux: leaves the unrelated node server alone', linuxPicked.some((p) => p.pid === 5000), false);

// ---------- macOS ----------
const macStdout = [
  '    1     0 /sbin/launchd',
  '  812   780 /usr/local/share/dotnet/dotnet watch --project apps/api/Api.csproj run --urls http://localhost:5000',
  '  840   812 /usr/local/share/dotnet/dotnet /usr/local/share/dotnet/sdk/10.0.400/DotnetTools/dotnet-watch/dotnet-watch.dll --project apps/api/Api.csproj run',
  '  865   840 /Users/piet/repos/mintplayer-ng-bootstrap/apps/api/bin/Debug/net10.0/Api --urls http://localhost:5000',
].join('\n');

const macPicked = selectLeftovers(parsePosixProcesses(macStdout), '/Users/piet/repos/mintplayer-ng-bootstrap');
check(
  'macos: picks the chain, deepest first',
  macPicked.map((p) => p.pid),
  [865, 840, 812],
);

// ---------- nothing to do ----------
check(
  'no leftovers: returns empty',
  selectLeftovers(parsePosixProcesses('    1     0 /sbin/init'), '/home/piet/mintplayer-ng-bootstrap').length,
  0,
);

// ---------- an apphost from ANOTHER checkout of the same repo ----------
const otherCheckout = parsePosixProcesses(
  ' 7000  6999 /home/piet/other-clone/apps/api/bin/Debug/net10.0/Api --urls http://localhost:5000',
);
check(
  'apphost from a different checkout is not matched by the bin rule',
  selectLeftovers(otherCheckout, '/home/piet/mintplayer-ng-bootstrap').length,
  0,
);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
