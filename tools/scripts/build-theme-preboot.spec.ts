/**
 * The dark-mode pre-boot script (PRD dark-mode D5): a blocking `<script src>`
 * in every consumer's `<head>`, so what it must never be is large, a module, or
 * newer than ES5. Each guard is pinned on a hand-made input, and the real
 * pipeline is run once against the real `preboot.ts` to prove what ships today
 * passes them — writing to a temp file, never the gitignored artifact codegen
 * owns.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { BUDGET, bundlePreboot, ENTRY, main, OUTFILE, validatePreboot } from './build-theme-preboot.mjs';

const dir = mkdtempSync(join(tmpdir(), 'mp-preboot-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const ES5 = '!function(){var e=document.documentElement;e.setAttribute("data-bs-theme","dark")}();';

describe('validatePreboot', () => {
  it('passes a small ES5 IIFE', () => {
    expect(validatePreboot(ES5)).toBeNull();
  });

  it('holds the budget at 1 KiB', () => {
    expect(BUDGET).toBe(1024);
  });

  it('rejects output over the budget, stating both sizes', () => {
    const big = `!function(){var a="${'x'.repeat(1100)}"}();`;
    expect(validatePreboot(big)).toBe(`${Buffer.byteLength(big)} B exceeds the 1024 B budget`);
  });

  it('measures bytes, not characters, so multi-byte text cannot slip under', () => {
    const text = `!function(){var a="${'é'.repeat(520)}"}();`;
    expect(text.length).toBeLessThan(1024);
    expect(validatePreboot(text)).toMatch(/exceeds the 1024 B budget/);
  });

  it('rejects module syntax leaking into the IIFE', () => {
    expect(validatePreboot('export var a=1;')).toBe(
      'output contains import/export (module syntax leaked into the IIFE)',
    );
  });

  it.each([
    ['const', 'const a=1;'],
    ['an arrow function', 'var f=()=>1;'],
    ['a template literal', 'var s=`x`;'],
  ])('rejects %s, which ES5 browsers cannot parse', (_label, code) => {
    expect(validatePreboot(code)).toMatch(/^output does not parse as an ES5 script: /);
  });

  it('honours a caller-supplied budget', () => {
    expect(validatePreboot(ES5, 10)).toMatch(/exceeds the 10 B budget/);
  });
});

describe('bundlePreboot', () => {
  it('turns the real preboot.ts into a script that passes every guard', async () => {
    const output = await bundlePreboot(ENTRY);
    expect(validatePreboot(output)).toBeNull();
    expect(output).toBe(output.trim());
  });
});

describe('main', () => {
  const quiet = () => ({ log: vi.fn(), error: vi.fn() });

  it('writes the default output next to the theming sources', () => {
    expect(OUTFILE.replace(/\\/g, '/')).toMatch(/libs\/mintplayer-web-components\/theming\/bs-theme-preboot\.js$/);
  });

  it('writes a passing script with a trailing newline and exits 0', async () => {
    const outfile = join(dir, 'ok.js');
    const io = quiet();
    expect(await main({ outfile, bundle: async () => ES5, ...io })).toBe(0);
    expect(readFileSync(outfile, 'utf8')).toBe(`${ES5}\n`);
    expect(io.log).toHaveBeenCalledWith(`build-theme-preboot: wrote ${outfile} (${ES5.length} B, budget 1024 B)`);
  });

  it('removes a stale output on failure, so a page cannot keep loading the last passing build', async () => {
    const outfile = join(dir, 'stale.js');
    writeFileSync(outfile, 'old');
    const io = quiet();
    expect(await main({ outfile, bundle: async () => 'const a=1;', ...io })).toBe(1);
    expect(existsSync(outfile)).toBe(false);
    expect(io.error).toHaveBeenCalledWith(expect.stringMatching(/^build-theme-preboot: output does not parse as an ES5 script/));
  });

  it('fails without a stale output to remove', async () => {
    const outfile = join(dir, 'never.js');
    expect(await main({ outfile, bundle: async () => 'export var a;', ...quiet() })).toBe(1);
    expect(existsSync(outfile)).toBe(false);
  });

  it('hands the entry to the bundler', async () => {
    const bundle = vi.fn(async () => ES5);
    await main({ entry: '/x/preboot.ts', outfile: join(dir, 'e.js'), bundle, ...quiet() });
    expect(bundle).toHaveBeenCalledWith('/x/preboot.ts');
  });
});
