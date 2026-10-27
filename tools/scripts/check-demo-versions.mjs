#!/usr/bin/env node
/**
 * Guard for docs/prd/package-version-in-demos.md §4.2: every deployed demo must
 * carry the version its library is released at.
 *
 * The library package.json files hold 0.0.0-PLACEHOLDER; the versioning
 * action's `phase: plan` stamps the real version into them in the `build` job,
 * right before the demo build reads them. This runs after that build and fails
 * when the stamp did not happen (the source still holds the placeholder) or a
 * demo's client or server bundle does not contain the stamped version.
 *
 * It asserts PRESENCE of the expected version, never absence of the
 * placeholder: @angular/core ships the literal 0.0.0-PLACEHOLDER in its own
 * code, so an absence check fails on every ng build (PRD F6).
 *
 * Usage (from the workspace root, after the demo build):
 *   node tools/scripts/check-demo-versions.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { runCli } from './lib/cli.mjs';

export const REPO_ROOT = resolve(import.meta.dirname, '../..');
export const PLACEHOLDER = '0.0.0-PLACEHOLDER';

/** Each demo, the library whose version it shows, and its client and server bundle dirs. */
export const DEMOS = [
  {
    name: 'ng-bootstrap-demo',
    packageJson: 'libs/mintplayer-ng-bootstrap/package.json',
    bundles: ['dist/apps/ng-bootstrap-demo/browser/browser', 'dist/apps/ng-bootstrap-demo/browser/server'],
  },
  {
    name: 'react-bootstrap-demo',
    packageJson: 'libs/mintplayer-react-bootstrap/package.json',
    bundles: ['dist/apps/react-bootstrap-demo/browser', 'dist/apps/react-bootstrap-demo/server'],
  },
  {
    name: 'vue-bootstrap-demo',
    packageJson: 'libs/mintplayer-vue-bootstrap/package.json',
    bundles: ['dist/apps/vue-bootstrap-demo/browser', 'dist/apps/vue-bootstrap-demo/server'],
  },
];

const SCRIPT = /\.(m?js)$/;

/** Every .js / .mjs file under dir, recursively. */
export function scriptFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? scriptFiles(join(dir, entry.name))
      : SCRIPT.test(entry.name) ? [join(dir, entry.name)] : [],
  );
}

/** Whether `source` holds `version` as a string literal, in any quote style a minifier may print. */
export const holdsVersion = (source, version) =>
  ['"', "'", '`'].some((quote) => source.includes(`${quote}${version}${quote}`));

/** What is wrong with one demo, as human-readable lines. Empty when it carries its version. */
export function problemsOf(demo, repoRoot) {
  const { version } = JSON.parse(readFileSync(resolve(repoRoot, demo.packageJson), 'utf8'));
  if (version === PLACEHOLDER) return [`${demo.packageJson} still holds ${PLACEHOLDER}: the versioning plan did not stamp it`];
  return demo.bundles.flatMap((bundle) => {
    const dir = resolve(repoRoot, bundle);
    if (!existsSync(dir)) return [`${bundle} does not exist; build ${demo.name} first`];
    return scriptFiles(dir).some((file) => holdsVersion(readFileSync(file, 'utf8'), version))
      ? []
      : [`no script under ${bundle} contains the version ${version}`];
  });
}

/** The guard: 1 when any demo lacks its version, 0 when all carry it. */
export function main({ repoRoot = REPO_ROOT, demos = DEMOS, log = console.log, error = console.error } = {}) {
  const failures = demos.flatMap((demo) => {
    const problems = problemsOf(demo, repoRoot);
    if (problems.length === 0) log(`check-demo-versions: OK  ${demo.name}`);
    return problems.map((problem) => `${demo.name}: ${problem}`);
  });
  if (failures.length === 0) return 0;
  error(`check-demo-versions: ${failures.join('\ncheck-demo-versions: ')}`);
  return 1;
}

runCli(import.meta.url, main);
