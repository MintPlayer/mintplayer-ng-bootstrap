/**
 * The shared half of the five DSD-chrome generators.
 *
 * These rules were previously copied into `gen-accordion-`, `gen-carousel-`,
 * `gen-dropdown-`, `gen-navbar-` and `gen-shell-chrome.mjs`, where none of them
 * could be tested: each generator does a top-level `await import()` of a built
 * `dist/` bundle and installs a global DOM shim, so importing one from a spec
 * needs a prior build and mutates globals process-wide. Lifting the pure half
 * out is what makes it reachable, and specs it once instead of five times.
 *
 * The generator loop itself (runChromeGenerator) lives here too now, with the
 * renderer injected; generators.spec.ts drives each generator through it.
 *
 * What stays untestable, deliberately: the SSR render itself and the `dist`
 * import. Those need the real built elements and belong to the e2e no-JS pass.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import {
  buildChromeModule,
  chromeArrayConstant,
  chromeConstant,
  ChromeGeneratorError,
  chromeOutPath,
  distEntryUrl,
  dsdChromeOf,
  extractDsdTemplate,
  mapSequential,
  MAX_CHROME_COUNT,
  REPO_ROOT,
  runChromeGenerator,
  staticChromeConstants,
} from './lib/chrome-module.mjs';

const DSD = '<template shadowrootmode="open"><div>hi</div></template>';

describe('extractDsdTemplate', () => {
  it('pulls the shadow template out of a render', () => {
    expect(extractDsdTemplate(`<mp-shell>${DSD}</mp-shell>`)).toBe(DSD);
  });

  it('matches regardless of where shadowrootmode sits among the attributes', () => {
    const tpl = '<template id="a" shadowrootmode="open" data-x="1"><p>x</p></template>';
    expect(extractDsdTemplate(`<host>${tpl}</host>`)).toBe(tpl);
  });

  it('accepts a delegatesFocus template, which several components emit', () => {
    const tpl = '<template shadowrootmode="open" shadowrootdelegatesfocus=""><b>x</b></template>';
    expect(extractDsdTemplate(tpl)).toBe(tpl);
  });

  it('TRUNCATES at a nested template — a known limitation, pinned deliberately', () => {
    // The quantifier is lazy, so the match ends at the FIRST </template>, which
    // for a shadow root containing its own <template> is the INNER one's close.
    // The extracted chrome is then unbalanced, and would be injected as such.
    //
    // No shipped component renders a nested <template> today, so this is latent
    // rather than broken — but it is a property of the regex, not an accident
    // of the fixtures, and a future component with a <template> in its shadow
    // root would ship silently corrupt no-JS chrome. Pinned so that the day it
    // matters, this test names the cause instead of the symptom.
    const nested = '<template shadowrootmode="open"><template>inner</template>';
    expect(extractDsdTemplate(`${nested}</template><p>after</p>`)).toBe(nested);
  });

  it('takes the first template when a render contains several', () => {
    const second = '<template shadowrootmode="open"><i>2</i></template>';
    expect(extractDsdTemplate(`${DSD}${second}`)).toBe(DSD);
  });

  it('spans newlines, since rendered chrome is multi-line', () => {
    const tpl = '<template shadowrootmode="open">\n  <div>\n    x\n  </div>\n</template>';
    expect(extractDsdTemplate(tpl)).toBe(tpl);
  });

  it('returns null for a render with no shadow root', () => {
    // A plain light-DOM element — the generators treat this as a hard failure,
    // because chrome that is silently empty would ship a broken no-JS page.
    expect(extractDsdTemplate('<mp-thing></mp-thing>')).toBeNull();
  });

  it('returns null for a template that is not a shadow root', () => {
    expect(extractDsdTemplate('<template id="plain"><p>x</p></template>')).toBeNull();
  });

  it.each([
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
  ])('returns null for %s rather than throwing', (_label, input) => {
    expect(extractDsdTemplate(input as never)).toBeNull();
  });
});

describe('chromeConstant', () => {
  it('emits an exported constant holding the escaped chrome', () => {
    expect(chromeConstant('MP_SHELL_DSD_CHROME', '<template>a</template>')).toBe(
      'export const MP_SHELL_DSD_CHROME = "<template>a</template>";',
    );
  });

  it('escapes characters that would otherwise break the emitted module', () => {
    // Chrome routinely contains quotes and newlines; JSON.stringify is what
    // keeps the generated .ts parseable.
    const emitted = chromeConstant('X', '<template class="a">\n</template>');
    expect(emitted).toContain('\\"a\\"');
    expect(emitted).toContain('\\n');
    expect(emitted.split('\n')).toHaveLength(1);
  });

  it('prefixes a doc comment when one is given', () => {
    expect(chromeConstant('X', 'a', 'Why this exists.')).toBe(
      '/** Why this exists. */\nexport const X = "a";',
    );
  });

  it('omits the comment entirely when there is none', () => {
    expect(chromeConstant('X', 'a')).not.toContain('/**');
  });
});

describe('chromeArrayConstant', () => {
  it('annotates the array readonly so a consumer cannot push into the table', () => {
    // Without the annotation the type widens to string[] and a compile-time
    // constant becomes mutable.
    expect(chromeArrayConstant('T', ['a', 'b'])).toBe(
      'export const T: readonly string[] = ["a","b"];',
    );
  });

  it('emits a valid empty table', () => {
    expect(chromeArrayConstant('T', [])).toContain('= [];');
  });

  it('carries a doc comment', () => {
    expect(chromeArrayConstant('T', ['a'], 'Indexed by count.')).toMatch(
      /^\/\*\* Indexed by count\. \*\/\n/,
    );
  });
});

describe('buildChromeModule', () => {
  const built = buildChromeModule({
    generator: 'gen-shell-chrome.mjs',
    source: 'the <mp-shell> Lit element rendered via @lit-labs/ssr.',
    declarations: ['export const A = "x";'],
  });

  it('warns against hand-editing and names the command that regenerates it', () => {
    // This header is the only thing between the file and someone editing a
    // generated artifact by hand.
    expect(built).toContain('AUTO-GENERATED — do not edit by hand.');
    expect(built).toContain('node tools/lit-ssr-utils/gen-shell-chrome.mjs');
  });

  it('records what the chrome was rendered from', () => {
    expect(built).toContain('// Source: the <mp-shell> Lit element rendered via @lit-labs/ssr.');
  });

  it('separates the header from the declarations with one blank line', () => {
    const lines = built.split('\n');
    expect(lines[2]).toMatch(/^\/\/ Source:/);
    expect(lines[3]).toBe('');
    expect(lines[4]).toBe('export const A = "x";');
  });

  it('ends with exactly one trailing newline', () => {
    expect(built.endsWith('";\n')).toBe(true);
    expect(built.endsWith('\n\n')).toBe(false);
  });

  it('joins several declarations, and an empty entry spaces them apart', () => {
    // The accordion generator emits two tables separated by a blank line.
    const two = buildChromeModule({
      generator: 'g.mjs',
      source: 's',
      declarations: ['export const A = "1";', '', 'export const B = "2";'],
    });
    expect(two).toContain('export const A = "1";\n\nexport const B = "2";\n');
  });

  it('emits header-only output for no declarations', () => {
    const empty = buildChromeModule({ generator: 'g.mjs', source: 's', declarations: [] });
    expect(empty.endsWith('// Source: s\n\n\n')).toBe(true);
  });
});

describe('MAX_CHROME_COUNT', () => {
  it('is the cap the accordion and carousel tables are built to', () => {
    // Both generators loop 0..MAX inclusive, so the table length is MAX + 1.
    expect(MAX_CHROME_COUNT).toBe(12);
  });
});

describe('REPO_ROOT', () => {
  it('is the workspace root, four levels above lib/chrome-module.mjs', () => {
    const here = fileURLToPath(new URL('.', import.meta.url));
    expect(REPO_ROOT).toBe(resolve(here, '..', '..'));
  });
});

describe('distEntryUrl', () => {
  it('points at the built entry of a web component as a file: URL', () => {
    const url = distEntryUrl(resolve('/repo'), 'shell');
    expect(url.startsWith('file:')).toBe(true);
    expect(fileURLToPath(url)).toBe(resolve('/repo', 'dist/libs/mintplayer-web-components/shell/index.mjs'));
  });
});

describe('chromeOutPath', () => {
  it('lands the generated module in the component\'s ssr dir', () => {
    expect(chromeOutPath(resolve('/repo'), 'navbar', 'x.generated.ts')).toBe(
      resolve('/repo', 'libs/mintplayer-web-components/navbar/ssr/x.generated.ts'),
    );
  });
});

describe('mapSequential', () => {
  it('maps in order and waits for each call before starting the next', async () => {
    const started: number[] = [];
    let running = 0;
    let overlapped = false;
    const out = await mapSequential([3, 1, 2], async (n: number) => {
      started.push(n);
      running++;
      overlapped ||= running > 1;
      await new Promise((r) => setTimeout(r, n));
      running--;
      return n * 10;
    });
    expect(out).toEqual([30, 10, 20]);
    expect(started).toEqual([3, 1, 2]);
    expect(overlapped).toBe(false);
  });

  it('returns an empty array for no items', async () => {
    expect(await mapSequential([], async () => 1)).toEqual([]);
  });
});

describe('dsdChromeOf', () => {
  it('renders the template and returns only its shadow template', async () => {
    const render = vi.fn(async () => `<mp-x>${DSD}<p>light</p></mp-x>`);
    expect(await dsdChromeOf({ render })('TPL', '<mp-x>')).toBe(DSD);
    expect(render).toHaveBeenCalledWith('TPL');
  });

  it('throws a reportable error carrying the render when there is no shadow root', async () => {
    const chromeOf = dsdChromeOf({ render: async () => '<mp-x></mp-x>' });
    const err = await chromeOf('TPL', '<mp-x>').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChromeGeneratorError);
    expect((err as ChromeGeneratorError).message).toBe('no DSD <template> for <mp-x>:\n');
    expect((err as ChromeGeneratorError).details).toEqual(['<mp-x></mp-x>']);
  });
});

describe('staticChromeConstants', () => {
  it('emits one constant per element, in order, logging each size', async () => {
    const log = vi.fn();
    const chromeOf = async (tpl: string) => `<template shadowrootmode="open">${tpl}</template>`;
    const out = await staticChromeConstants({
      generator: 'gen-x',
      chromeOf,
      log,
      elements: [
        { tag: 'mp-a', constant: 'A', template: 'a' },
        { tag: 'mp-b', constant: 'B', template: 'b' },
      ],
    });
    expect(out).toEqual([
      'export const A = "<template shadowrootmode=\\"open\\">a</template>";',
      'export const B = "<template shadowrootmode=\\"open\\">b</template>";',
    ]);
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'gen-x: <mp-a> chrome 44 chars',
      'gen-x: <mp-b> chrome 44 chars',
    ]);
  });
});

describe('runChromeGenerator', () => {
  const base = () => ({
    generator: 'gen-x',
    source: 'the x element.',
    out: '/out/x.generated.ts',
    write: vi.fn(async () => undefined),
    log: vi.fn(),
    error: vi.fn(),
  });

  it('writes the module built from the declarations and exits 0', async () => {
    const opts = base();
    const code = await runChromeGenerator({ ...opts, build: async () => ({ declarations: ['export const A = "1";'] }) });
    expect(code).toBe(0);
    expect(opts.write).toHaveBeenCalledWith(
      '/out/x.generated.ts',
      buildChromeModule({ generator: 'gen-x.mjs', source: 'the x element.', declarations: ['export const A = "1";'] }),
      'utf8',
    );
    expect(opts.log).toHaveBeenCalledWith('gen-x: wrote /out/x.generated.ts');
  });

  it('appends the build\'s note to the wrote line', async () => {
    const opts = base();
    await runChromeGenerator({ ...opts, build: async () => ({ declarations: [], note: ' (9 chars)' }) });
    expect(opts.log).toHaveBeenCalledWith('gen-x: wrote /out/x.generated.ts (9 chars)');
  });

  it('reports a generator error with its details, exits 1, and leaves the old module in place', async () => {
    const opts = base();
    const code = await runChromeGenerator({
      ...opts,
      build: async () => { throw new ChromeGeneratorError('no sheet', 'detail-1', 'detail-2'); },
    });
    expect(code).toBe(1);
    expect(opts.error).toHaveBeenCalledWith('gen-x: no sheet', 'detail-1', 'detail-2');
    expect(opts.write).not.toHaveBeenCalled();
  });

  it('lets any other error propagate, since it is a bug rather than a bad render', async () => {
    const opts = base();
    const bug = new TypeError('x is undefined');
    await expect(runChromeGenerator({ ...opts, build: async () => { throw bug; } })).rejects.toBe(bug);
    expect(opts.error).not.toHaveBeenCalled();
  });
});
