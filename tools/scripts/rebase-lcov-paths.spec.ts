/**
 * The lcov SF: rebasing rules — the transform every coverage number this
 * workspace publishes now passes through. A silent regression here
 * re-introduces the 314-dropped-files defect the script's own header
 * documents, so the load-bearing properties (idempotence, separator
 * normalisation, the hard failure on unresolvable paths) are each pinned.
 *
 * The module is side-effect-free on import (CLI work sits behind an
 * isEntryPoint guard); `exists` is injected so no case touches the real tree
 * or depends on the cwd vitest happens to run from.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { findReports, prefixFor, rebaseLcov } from './rebase-lcov-paths.mjs';

// ===========================================================================
// prefixFor: coverage/<project path>/lcov.info -> <project path>, posix
// ===========================================================================

describe('prefixFor', () => {
  it('derives the project path from the report location', () => {
    expect(prefixFor(join('coverage', 'libs', 'foo', 'lcov.info'), 'coverage')).toBe('libs/foo');
  });

  it('keeps deeper nesting intact', () => {
    expect(prefixFor(join('coverage', 'apps', 'demo', 'e2e', 'lcov.info'), 'coverage')).toBe(
      'apps/demo/e2e',
    );
  });

  it('accepts posix-separated input even where the native separator differs', () => {
    // The guarantee that motivated splitting on /[\\/]/: a posix-path caller
    // works on Windows too. The reverse fixture (a backslash literal) is NOT
    // asserted — on posix a backslash is a legal filename character, not a
    // separator, so that input has no portable meaning. The native-separator
    // case is already covered by the join()-built fixtures above, which use
    // backslashes when the suite runs on Windows.
    expect(prefixFor('coverage/libs/foo/lcov.info', 'coverage')).toBe('libs/foo');
  });

  it('returns an empty prefix for a report sitting directly in the coverage dir', () => {
    // The CLI refuses to rewrite in that case — there is no project to
    // attribute the paths to.
    expect(prefixFor(join('coverage', 'lcov.info'), 'coverage')).toBe('');
  });
});

// ===========================================================================
// rebaseLcov: the pure transform
// ===========================================================================

const always = () => true;
const never = () => false;

describe('rebaseLcov', () => {
  it('prefixes every SF: line and counts the rewrites', () => {
    const input = ['TN:', 'SF:src/a.ts', 'DA:1,1', 'end_of_record', 'SF:src/b.ts', 'end_of_record', ''].join('\n');
    const result = rebaseLcov(input, 'libs/foo', always);

    expect(result.text).toBe(
      ['TN:', 'SF:libs/foo/src/a.ts', 'DA:1,1', 'end_of_record', 'SF:libs/foo/src/b.ts', 'end_of_record', ''].join('\n'),
    );
    expect(result.rewritten).toBe(2);
    expect(result.alreadyRooted).toBe(0);
    expect(result.unresolved).toEqual([]);
  });

  it('leaves non-SF lines byte-identical, including end_of_record', () => {
    const input = 'TN:\nDA:12,0\nBRDA:3,0,0,1\nend_of_record\n';
    expect(rebaseLcov(input, 'libs/foo', always).text).toBe(input);
  });

  it('is idempotent: a second run only counts already-rooted, changes nothing', () => {
    const once = rebaseLcov('SF:src/a.ts\nend_of_record\n', 'libs/foo', always);
    const twice = rebaseLcov(once.text, 'libs/foo', always);

    expect(twice.text).toBe(once.text);
    expect(twice.rewritten).toBe(0);
    expect(twice.alreadyRooted).toBe(1);
  });

  it('handles a mixed report: rooted paths kept, bare paths prefixed', () => {
    const input = 'SF:libs/foo/src/a.ts\nend_of_record\nSF:src/b.ts\nend_of_record\n';
    const result = rebaseLcov(input, 'libs/foo', always);

    expect(result.alreadyRooted).toBe(1);
    expect(result.rewritten).toBe(1);
    expect(result.text).toContain('SF:libs/foo/src/b.ts');
  });

  it('normalises backslash-separated SF paths to posix', () => {
    const result = rebaseLcov('SF:src\\lib\\a.ts\nend_of_record\n', 'libs/foo', always);
    expect(result.text).toContain('SF:libs/foo/src/lib/a.ts');
  });

  it('does not treat a shared name prefix as rooted', () => {
    // `libs/foo-bar/...` must NOT count as already rooted under `libs/foo` —
    // the guard is on the full segment (`libs/foo/`), not a string prefix.
    const result = rebaseLcov('SF:libs/foo-bar/src/a.ts\nend_of_record\n', 'libs/foo', always);
    expect(result.rewritten).toBe(1);
    expect(result.text).toContain('SF:libs/foo/libs/foo-bar/src/a.ts');
  });

  it('reads CRLF input and always writes LF', () => {
    const result = rebaseLcov('SF:src/a.ts\r\nDA:1,1\r\nend_of_record\r\n', 'libs/foo', always);
    expect(result.text).toBe('SF:libs/foo/src/a.ts\nDA:1,1\nend_of_record\n');
  });

  it('preserves a trailing newline', () => {
    expect(rebaseLcov('end_of_record\n', 'libs/foo', always).text).toBe('end_of_record\n');
  });

  it('collects every rewritten path that does not resolve on disk', () => {
    const result = rebaseLcov('SF:src/a.ts\nSF:src/b.ts\n', 'libs/foo', never);
    expect(result.unresolved).toEqual([
      { raw: 'src/a.ts', rooted: 'libs/foo/src/a.ts' },
      { raw: 'src/b.ts', rooted: 'libs/foo/src/b.ts' },
    ]);
    // Unresolved paths are still rewritten — the CLI fails the build on them,
    // it does not half-apply the transform.
    expect(result.rewritten).toBe(2);
  });

  it('checks existence of the ROOTED path, never the raw one', () => {
    const asked: string[] = [];
    rebaseLcov('SF:src/a.ts\n', 'libs/foo', (p) => {
      asked.push(p);
      return true;
    });
    expect(asked).toEqual(['libs/foo/src/a.ts']);
  });

  it('does not consult exists for already-rooted paths', () => {
    const asked: string[] = [];
    rebaseLcov('SF:libs/foo/src/a.ts\n', 'libs/foo', (p) => {
      asked.push(p);
      return true;
    });
    expect(asked).toEqual([]);
  });
});

// ===========================================================================
// findReports: real fs against a temp tree
// ===========================================================================

describe('findReports', () => {
  const root = mkdtempSync(join(tmpdir(), 'rebase-lcov-spec-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('finds every lcov.info at any depth and nothing else', () => {
    mkdirSync(join(root, 'libs', 'foo'), { recursive: true });
    mkdirSync(join(root, 'apps', 'demo', 'nested'), { recursive: true });
    writeFileSync(join(root, 'libs', 'foo', 'lcov.info'), '');
    writeFileSync(join(root, 'apps', 'demo', 'nested', 'lcov.info'), '');
    writeFileSync(join(root, 'libs', 'foo', 'coverage-final.json'), '{}');
    writeFileSync(join(root, 'notes.txt'), '');

    // Assert on membership, not order: readdir order is platform-dependent.
    const found = findReports(root).sort();
    expect(found).toEqual(
      [join(root, 'apps', 'demo', 'nested', 'lcov.info'), join(root, 'libs', 'foo', 'lcov.info')].sort(),
    );
  });

  it('returns [] for a missing directory instead of throwing', () => {
    expect(findReports(join(root, 'does-not-exist'))).toEqual([]);
  });
});
