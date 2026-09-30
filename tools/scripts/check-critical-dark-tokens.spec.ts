/**
 * The CI guard for PRD dark-mode D5c, driven against temp dist trees.
 *
 * It has three verdicts, and each matters for a different reason:
 *   - nothing inlined at build time (the recorded fallback) is a PASS, and the
 *     one the demo actually ships today;
 *   - critical CSS inlined but missing the dark block is the regression the
 *     guard exists for, and must FAIL;
 *   - no index template at all must also FAIL, or a moved build output would
 *     turn the guard into a silent pass.
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_DIST_DIR,
  findIndexTemplates,
  isInlinedAtBuild,
  main,
  missingDarkTokens,
} from './check-critical-dark-tokens.mjs';

const roots: string[] = [];
function tree(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'mp-dark-tokens-')));
  roots.push(root);
  Object.entries(files).map(([rel, content]) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content, 'utf8');
  });
  return root;
}
afterAll(() => roots.map((root) => rmSync(root, { recursive: true, force: true })));

const LINK_INLINED = '<link rel="stylesheet" href="styles.css" media="print" onload="this.media=\'all\'">';
const LINK_PLAIN = '<link rel="stylesheet" href="styles.css">';
const DARK_CSS = '<style>[data-bs-theme=dark]{--mp-color-mode: dark}</style>';
const LIGHT_CSS = '<style>:root{--mp-color-mode: light}</style>';

function run(root: string, argv: string[] = ['dist']) {
  const log = vi.fn();
  const error = vi.fn();
  const code = main({ argv, repoRoot: root, log, error });
  return { code, logged: log.mock.calls.map(([l]) => l), errored: error.mock.calls.map(([l]) => l) };
}

describe('isInlinedAtBuild', () => {
  it('recognises the print-media link beasties leaves behind when it inlines', () => {
    expect(isInlinedAtBuild(LINK_INLINED)).toBe(true);
  });

  it('treats a plain render-blocking stylesheet link as not inlined', () => {
    expect(isInlinedAtBuild(LINK_PLAIN)).toBe(false);
  });
});

describe('missingDarkTokens', () => {
  it('reports nothing when the inlined CSS has both the selector and the token', () => {
    expect(missingDarkTokens(DARK_CSS)).toEqual([]);
  });

  it('accepts a quoted attribute value in the selector', () => {
    expect(missingDarkTokens('<style>[data-bs-theme="dark"]{--mp-color-mode:dark}</style>')).toEqual([]);
  });

  it('names both gaps when the dark block was pruned', () => {
    expect(missingDarkTokens(LIGHT_CSS)).toEqual([
      'a [data-bs-theme=dark] selector',
      'the --mp-color-mode:dark declaration',
    ]);
  });

  it('reads only style blocks, not dark tokens that appear elsewhere in the page', () => {
    expect(missingDarkTokens('<html data-bs-theme=dark><!-- --mp-color-mode: dark --></html>')).toHaveLength(2);
  });

  it('combines several style blocks', () => {
    expect(missingDarkTokens('<style>[data-bs-theme=dark]{}</style><style>a{--mp-color-mode:dark}</style>')).toEqual([]);
  });
});

describe('findIndexTemplates', () => {
  it('finds templates at the top and one level down, but not prerendered routes deeper', () => {
    const root = tree({
      'index.csr.html': '',
      'server/index.server.html': '',
      'server/other.html': '',
      'about/deep/index.html': '',
    });
    expect(findIndexTemplates(root).map((f) => f.slice(root.length + 1).replace(/\\/g, '/')).sort()).toEqual([
      'index.csr.html',
      'server/index.server.html',
    ]);
  });
});

describe('main', () => {
  it('defaults to the Angular demo browser build', () => {
    expect(DEFAULT_DIST_DIR).toBe('dist/apps/ng-bootstrap-demo/browser');
  });

  it('fails when the dist dir does not exist, naming the build to run', () => {
    const { code, errored } = run(tree({}), ['nope']);
    expect(code).toBe(1);
    expect(errored[0]).toMatch(/^check-critical-dark-tokens: .*nope does not exist; run `nx build ng-bootstrap-demo` first$/);
  });

  it('fails when the dist holds no index template, so a moved output cannot pass silently', () => {
    const { code, errored } = run(tree({ 'dist/main.js': '' }));
    expect(code).toBe(1);
    expect(errored[0]).toContain('no built index template (index.csr.html, index.server.html, index.html)');
  });

  it('passes the recorded fallback: nothing inlined at build time', () => {
    const { code, logged } = run(tree({ 'dist/index.csr.html': LINK_PLAIN + LIGHT_CSS }));
    expect(code).toBe(0);
    expect(logged[0]).toMatch(/OK {2}no build-time critical CSS in .*index\.csr\.html \(inlineCritical disabled: the D5c fallback\)$/);
  });

  it('passes inlined critical CSS that kept the dark block', () => {
    const { code, logged } = run(tree({ 'dist/index.html': LINK_INLINED + DARK_CSS }));
    expect(code).toBe(0);
    expect(logged).toEqual([expect.stringMatching(/^check-critical-dark-tokens: OK {2}dist[\\/]index\.html$/)]);
  });

  it('fails inlined critical CSS that lost the dark block, naming the file and the gaps', () => {
    const { code, errored } = run(
      tree({ 'dist/index.html': LINK_INLINED + LIGHT_CSS, 'dist/server/index.csr.html': LINK_INLINED + DARK_CSS }),
    );
    expect(code).toBe(1);
    expect(errored).toHaveLength(1);
    expect(errored[0]).toMatch(
      /index\.html: the inlined critical CSS lacks a \[data-bs-theme=dark\] selector and the --mp-color-mode:dark declaration$/,
    );
    expect(errored[0]).not.toContain('index.csr.html');
  });

  it('ignores a template the SSR engine inlines per request (no print-media link)', () => {
    const { code } = run(tree({ 'dist/index.server.html': LIGHT_CSS, 'dist/index.html': LINK_INLINED + DARK_CSS }));
    expect(code).toBe(0);
  });
});
