/**
 * The Vite half of dark-mode wiring for the React/Vue demos: serve the
 * generated pre-boot script in dev, emit it into the client build, emit nothing
 * for the SSR build, and fail — never ship a 404ing blocking script — when
 * codegen has not produced it.
 *
 * The plugin hooks are called with minimal fakes of Vite's server and Rollup's
 * plugin context; the file is a temp stand-in, because the real one is a
 * gitignored codegen artifact that may not exist when the suite runs.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { colorModeCssAlias, THEME_PREBOOT_URL, themePreboot } from './theme-preboot.mts';

const dir = mkdtempSync(join(tmpdir(), 'mp-theme-preboot-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const present = join(dir, 'bs-theme-preboot.js');
writeFileSync(present, '!function(){}();\n');
const absent = join(dir, 'missing.js');

type Hook = (...args: unknown[]) => unknown;
const hook = (plugin: object, name: string) => (plugin as Record<string, Hook>)[name];

describe('themePreboot', () => {
  describe('apply', () => {
    const apply = (command: string, isSsrBuild: boolean) =>
      hook(themePreboot(present), 'apply')({}, { command, isSsrBuild });

    it('runs for the dev server', () => {
      expect(apply('serve', false)).toBe(true);
    });

    it('runs for the client build', () => {
      expect(apply('build', false)).toBe(true);
    });

    it('stays out of the SSR build, whose server serves the client build\'s copy', () => {
      expect(apply('build', true)).toBe(false);
    });
  });

  describe('configureServer', () => {
    function mount(file: string) {
      const use = vi.fn();
      hook(themePreboot(file), 'configureServer')({ middlewares: { use } });
      const [[url, handler]] = use.mock.calls as [[string, Hook]];
      const res = { setHeader: vi.fn(), end: vi.fn() };
      return { url, serve: () => handler({}, res), res };
    }

    it('mounts the script at the URL the demos\' index.html loads', () => {
      expect(mount(present).url).toBe(THEME_PREBOOT_URL);
      expect(THEME_PREBOOT_URL).toBe('/theming/bs-theme-preboot.js');
    });

    it('serves the file as uncached JavaScript', () => {
      const { serve, res } = mount(present);
      serve();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/javascript; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(String(res.end.mock.calls[0][0])).toBe('!function(){}();\n');
    });

    it('re-reads per request, so a regeneration during the dev session is picked up', () => {
      const file = join(dir, 'regenerated.js');
      writeFileSync(file, 'v1');
      const { serve, res } = mount(file);
      serve();
      writeFileSync(file, 'v2');
      serve();
      expect(res.end.mock.calls.map(([body]) => String(body))).toEqual(['v1', 'v2']);
    });

    it('throws a pointer to codegen-wc when the file is missing', () => {
      const { serve } = mount(absent);
      expect(serve).toThrow(/themePreboot: .*missing\.js is missing \(run nx run mintplayer-web-components:codegen-wc\)/);
    });
  });

  describe('generateBundle', () => {
    it('emits the file as an asset at the served path, without the leading slash', () => {
      const ctx = { emitFile: vi.fn(), error: vi.fn() };
      hook(themePreboot(present), 'generateBundle').call(ctx);
      expect(ctx.emitFile).toHaveBeenCalledWith({
        type: 'asset',
        fileName: 'theming/bs-theme-preboot.js',
        source: expect.any(Buffer),
      });
    });

    it('fails the build through Rollup\'s error when the file is missing', () => {
      const ctx = {
        emitFile: vi.fn(),
        error: vi.fn((message: string) => {
          throw new Error(message);
        }),
      };
      expect(() => hook(themePreboot(absent), 'generateBundle').call(ctx)).toThrow(/is missing/);
      expect(ctx.emitFile).not.toHaveBeenCalled();
    });
  });

  it('defaults to the codegen output in the web-components theming dir', () => {
    const use = vi.fn();
    hook(themePreboot(), 'configureServer')({ middlewares: { use } });
    const res = { setHeader: vi.fn(), end: vi.fn() };
    // Whether or not codegen has run, the path in play is the theming one.
    try {
      (use.mock.calls[0][1] as Hook)({}, res);
    } catch (err) {
      expect(String(err)).toMatch(/libs[\\/]mintplayer-web-components[\\/]theming[\\/]bs-theme-preboot\.js/);
      return;
    }
    expect(res.end).toHaveBeenCalled();
  });
});

describe('colorModeCssAlias', () => {
  it('maps the package CSS import to the source file, which Vite CSS resolution cannot find via tsconfig paths', () => {
    expect(colorModeCssAlias.find).toBe('@mintplayer/web-components/theming/color-mode.css');
    expect(colorModeCssAlias.replacement).toBe(
      resolve(import.meta.dirname, '../../libs/mintplayer-web-components/theming/color-mode.css'),
    );
  });
});
