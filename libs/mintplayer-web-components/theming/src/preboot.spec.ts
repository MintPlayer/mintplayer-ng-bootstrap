import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'acorn';
import { readThemeCookie } from './cookie';
import { readDefaultModeMeta, resolveMode } from './resolve';

// Smoke test of the GENERATED bundle (PRD dark-mode D5). It is produced by
// tools/scripts/build-theme-preboot.mjs during codegen-wc; the file is a
// gitignored build artifact, so a fresh checkout has to run codegen first.
// jsdom gives import.meta.url a non-file scheme, so resolve from the cwd the
// way _conformance/light-styles-scoping.spec.ts does.
const LIB_ROOT = existsSync(join(process.cwd(), 'theming'))
  ? process.cwd()
  : join(process.cwd(), 'libs', 'mintplayer-web-components');
const BUNDLE_PATH = join(LIB_ROOT, 'theming', 'bs-theme-preboot.js');
const bundleExists = existsSync(BUNDLE_PATH);
const SKIP_REASON =
  'theming/bs-theme-preboot.js does not exist: run `npx nx run mintplayer-web-components:codegen-wc` first';

interface Env {
  cookie: string;
  meta?: string;
  /** `undefined` = no matchMedia at all (old engines). */
  prefersDark?: boolean;
}

interface Run {
  attribute: string | null;
  threw: unknown;
}

function fakeDocument(env: Env, attrs: Record<string, string>) {
  return {
    cookie: env.cookie,
    querySelector: (selector: string) =>
      env.meta !== undefined && selector === 'meta[name="bs-theme-default-mode"]'
        ? { getAttribute: (name: string) => (name === 'content' ? env.meta : null) }
        : null,
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attrs[name] = value;
      },
    },
  };
}

function fakeWindow(env: Env) {
  return env.prefersDark === undefined
    ? {}
    : { matchMedia: (query: string) => ({ matches: query === '(prefers-color-scheme: dark)' && env.prefersDark }) };
}

/** Execute the bundle with `document` / `window` bound to fakes. */
function runBundle(code: string, document: unknown, window: unknown): unknown {
  try {
    new Function('document', 'window', code)(document, window);
    return undefined;
  } catch (error) {
    return error;
  }
}

function run(code: string, env: Env): Run {
  const attrs: Record<string, string> = {};
  const threw = runBundle(code, fakeDocument(env, attrs), fakeWindow(env));
  return { attribute: attrs['data-bs-theme'] ?? null, threw };
}

/** The same inputs through the core modules the bundle was generated from. */
function expected(env: Env): string {
  const attrs: Record<string, string> = {};
  const doc = fakeDocument(env, attrs) as unknown as Document;
  const mode = readThemeCookie(env.cookie) || readDefaultModeMeta(doc) || 'auto';
  return resolveMode(mode, env.prefersDark === true);
}

describe.skipIf(!bundleExists)('bs-theme-preboot.js (generated)', () => {
  const code = bundleExists ? readFileSync(BUNDLE_PATH, 'utf8') : '';

  describe('build guards', () => {
    it('stays within the 1 KB budget', () => {
      expect(Buffer.byteLength(code)).toBeLessThanOrEqual(1024);
    });

    it('contains no module syntax', () => {
      expect(code).not.toMatch(/\b(?:import|export)\b/);
    });

    it('parses as an ES5 script', () => {
      expect(() => parse(code, { ecmaVersion: 5, sourceType: 'script' })).not.toThrow();
    });
  });

  describe('matches resolveMode on the same inputs', () => {
    it.each<[string, Env, string]>([
      ['no cookie, light OS', { cookie: '', prefersDark: false }, 'light'],
      ['no cookie, dark OS', { cookie: '', prefersDark: true }, 'dark'],
      ['no cookie, no matchMedia', { cookie: '' }, 'light'],
      ['explicit dark over a light OS', { cookie: 'bs-theme-mode=dark', prefersDark: false }, 'dark'],
      ['explicit light over a dark OS', { cookie: 'bs-theme-mode=light', prefersDark: true }, 'light'],
      ['auto cookie, dark OS', { cookie: 'bs-theme-mode=auto', prefersDark: true }, 'dark'],
      ['custom mode', { cookie: 'bs-theme-mode=sepia', prefersDark: true }, 'sepia'],
      ['upper-case cookie', { cookie: 'bs-theme-mode=DARK', prefersDark: false }, 'dark'],
      ['cookie among others', { cookie: 'a=1; bs-theme-mode=dark; b=2', prefersDark: false }, 'dark'],
      ['first pair wins', { cookie: 'bs-theme-mode=light; bs-theme-mode=dark', prefersDark: true }, 'light'],
      ['invalid cookie is absent', { cookie: 'bs-theme-mode=x%22%3E%3Cscript%3E', prefersDark: true }, 'dark'],
      ['undecodable cookie is absent', { cookie: 'bs-theme-mode=%E0%A4%A', prefersDark: false }, 'light'],
      ['meta default, no cookie', { cookie: '', meta: 'dark', prefersDark: false }, 'dark'],
      ['meta auto, dark OS', { cookie: '', meta: 'auto', prefersDark: true }, 'dark'],
      ['cookie beats meta', { cookie: 'bs-theme-mode=light', meta: 'dark', prefersDark: true }, 'light'],
      ['valid auto cookie beats meta', { cookie: 'bs-theme-mode=auto', meta: 'dark', prefersDark: false }, 'light'],
      ['invalid cookie falls back to meta', { cookie: 'bs-theme-mode=bad value', meta: 'dark', prefersDark: false }, 'dark'],
      ['invalid meta is absent', { cookie: '', meta: 'x"><script>', prefersDark: true }, 'dark'],
      ['custom meta', { cookie: '', meta: 'Sepia', prefersDark: false }, 'sepia'],
    ])('%s', (_name, env, literal) => {
      const result = run(code, env);
      expect(result.threw).toBeUndefined();
      expect(result.attribute).toBe(expected(env));
      expect(result.attribute).toBe(literal);
    });
  });

  describe('never blocks the page', () => {
    it('swallows a throwing matchMedia', () => {
      const attrs: Record<string, string> = {};
      const threw = runBundle(code, fakeDocument({ cookie: '' }, attrs), {
        matchMedia: () => {
          throw new Error('boom');
        },
      });
      expect(threw).toBeUndefined();
    });

    it('swallows a missing documentElement', () => {
      expect(runBundle(code, { cookie: '', querySelector: () => null }, {})).toBeUndefined();
    });

    it('swallows a throwing cookie getter', () => {
      const doc = {
        get cookie(): string {
          throw new Error('SecurityError');
        },
        querySelector: () => null,
        documentElement: { setAttribute: () => undefined },
      };
      expect(runBundle(code, doc, {})).toBeUndefined();
    });
  });
});

describe.runIf(!bundleExists)('bs-theme-preboot.js (generated) — skipped', () => {
  it.skip(SKIP_REASON, () => undefined);
});
