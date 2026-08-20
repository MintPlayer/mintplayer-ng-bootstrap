import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `main()` resolves `metadata.max.json` through `require.resolve`, which no
 * parameter can redirect — so the only seam for the format-version guard is the
 * read itself. Everything else in this spec (the slicing) is pure and needs no
 * filesystem at all.
 */
let fakeMetadata: unknown = null;

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: (path: string, ...rest: unknown[]) =>
      fakeMetadata !== null && String(path).endsWith('metadata.max.json')
        ? Promise.resolve(JSON.stringify(fakeMetadata))
        : (actual.readFile as (...a: unknown[]) => Promise<unknown>)(path, ...rest),
  };
});

import {
  SUPPORTED_FORMAT_VERSION,
  blockModule,
  chunkName,
  countryToCallingCodeMap,
  loaderModule,
  main,
  phonePaths,
  sliceFor,
} from './build-phone-metadata.mjs';

/**
 * Three countries over two calling codes, one of them shared (+1 US/CA — the
 * case the slicer exists for), plus libphonenumber's '001' pseudo-country.
 * The country payloads are positional arrays in the real format; only index 0
 * (the calling code) is ever read here, so the rest is a marker we can assert
 * survived the slice byte-for-byte.
 */
const makeFull = (version = SUPPORTED_FORMAT_VERSION) => ({
  version,
  country_calling_codes: { '1': ['US', 'CA'], '32': ['BE'], '800': ['001'] },
  countries: {
    US: ['1', '[2-9]\\d{9}', 'us-rules'],
    CA: ['1', '[2-9]\\d{9}', 'ca-rules'],
    BE: ['32', '[1-9]\\d{7,8}', 'be-rules'],
    '001': ['800', '\\d{8}', 'pseudo'],
  },
  nonGeographic: { '800': ['nongeo'] },
});

describe('sliceFor', () => {
  it('keeps every country of a shared calling code, in the full table order', () => {
    const sliced = sliceFor(makeFull(), '1');
    expect(sliced.country_calling_codes).toEqual({ '1': ['US', 'CA'] });
    expect(Object.keys(sliced.countries)).toEqual(['US', 'CA']);
  });

  it('carries the country payloads through untouched', () => {
    expect(sliceFor(makeFull(), '32').countries).toEqual({ BE: ['32', '[1-9]\\d{7,8}', 'be-rules'] });
  });

  it('carries the format version so the consumer metadata stays self-describing', () => {
    expect(sliceFor(makeFull(), '32').version).toBe(SUPPORTED_FORMAT_VERSION);
  });

  it('empties nonGeographic — the section is required but no selectable country uses it', () => {
    expect(sliceFor(makeFull(), '1').nonGeographic).toEqual({});
  });

  it('copies the member list instead of aliasing the source table', () => {
    const full = makeFull();
    const sliced = sliceFor(full, '1');
    sliced.country_calling_codes['1'].push('XX');
    expect(full.country_calling_codes['1']).toEqual(['US', 'CA']);
  });

  it('slices a single-member calling code', () => {
    expect(sliceFor(makeFull(), '32').country_calling_codes).toEqual({ '32': ['BE'] });
  });
});

describe('chunkName', () => {
  it('is filename-safe and stable per calling code', () => {
    expect(chunkName('1')).toBe('cc-1');
    expect(chunkName('32')).toBe('cc-32');
  });
});

describe('blockModule', () => {
  const module1 = blockModule('1', sliceFor(makeFull(), '1'));

  it('opens with the auto-generated header', () => {
    expect(module1.split('\n')[0]).toBe('// AUTO-GENERATED — do not edit by hand.');
  });

  it('names the calling code and every member country in a comment', () => {
    expect(module1).toContain('// Calling code +1: US, CA');
  });

  it('emits the slice as a typed default export', () => {
    expect(module1).toContain("import type { MetadataJson } from 'libphonenumber-js/core';");
    expect(module1).toContain('const metadata: MetadataJson = {');
    expect(module1.trimEnd().endsWith('export default metadata;')).toBe(true);
  });

  it('round-trips the sliced metadata through the emitted JSON', () => {
    const json = module1.slice(module1.indexOf('= {') + 2, module1.lastIndexOf(';\n\nexport default'));
    expect(JSON.parse(json)).toEqual(sliceFor(makeFull(), '1'));
  });

  it('ends with a trailing newline', () => {
    expect(module1.endsWith('\n')).toBe(true);
  });
});

describe('loaderModule', () => {
  const mod = loaderModule({ be: '32', ca: '1', us: '1' });

  it('sorts the country union so the output is stable', () => {
    expect(mod).toContain("export type PhoneMetadataCountry =\n  | 'be'\n  | 'ca'\n  | 'us';");
  });

  it('points every country at its calling-code chunk, sharing one chunk per block', () => {
    expect(mod).toContain("  'ca': () => import('./metadata/cc-1.generated'),");
    expect(mod).toContain("  'us': () => import('./metadata/cc-1.generated'),");
    expect(mod).toContain("  'be': () => import('./metadata/cc-32.generated'),");
  });

  // A computed specifier survives into the published .mjs and either hard-fails
  // an esbuild consumer or globs the whole directory into their bundle.
  it('emits only static string-literal import specifiers', () => {
    expect(mod).not.toMatch(/import\(`/);
    expect(mod).not.toMatch(/\$\{/);
  });
});

describe('countryToCallingCodeMap', () => {
  it('lowercases the ISO code and maps it to its calling code', () => {
    expect(countryToCallingCodeMap(makeFull())).toMatchObject({ us: '1', ca: '1', be: '32' });
  });

  it("drops '001', libphonenumber's non-geographic pseudo-country", () => {
    expect(Object.keys(countryToCallingCodeMap(makeFull()))).not.toContain('001');
    expect(Object.keys(countryToCallingCodeMap(makeFull()))).toHaveLength(3);
  });
});

describe('phonePaths', () => {
  it('derives every path from the injected repo root', () => {
    const root = join('base', 'repo');
    const paths = phonePaths(root);
    expect(paths.coreSrc).toBe(join(root, 'libs/mintplayer-web-components/phone-core/src'));
    expect(paths.metadataDir).toBe(join(paths.coreSrc, 'metadata'));
    expect(paths.loadersPath).toBe(join(paths.coreSrc, 'metadata-loaders.generated.ts'));
  });
});

describe('main', () => {
  let root: string;
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // realpath: Windows hands back a short/junction path from mkdtemp.
    root = realpathSync(await mkdtemp(join(tmpdir(), 'phone-meta-')));
    fakeMetadata = makeFull();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    exit = vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
  });

  afterEach(async () => {
    fakeMetadata = null;
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it('writes one chunk per calling code plus the loader map', async () => {
    await main(root);

    const { metadataDir, loadersPath } = phonePaths(root);
    expect((await readdir(metadataDir)).sort()).toEqual(['cc-1.generated.ts', 'cc-32.generated.ts']);
    expect(await readFile(loadersPath, 'utf8')).toContain("'us': () => import('./metadata/cc-1.generated'),");
  });

  it("emits no chunk for the '001' pseudo-country's calling code", async () => {
    await main(root);
    expect(await readdir(phonePaths(root).metadataDir)).not.toContain('cc-800.generated.ts');
  });

  it('reports the country and chunk counts', async () => {
    await main(root);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3 countries in 2 calling-code chunks'));
  });

  it('is idempotent — a second run writes nothing', async () => {
    await main(root);
    vi.mocked(console.log).mockClear();
    await main(root);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('0 written'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('map unchanged'));
  });

  // The guard is the only thing between a libphonenumber bump and silently
  // wrong validation rules: every field this slicer reads is positional, so a
  // format-version change relocates them and the emitted chunks would still
  // parse — they would simply validate the wrong digits. Both directions are
  // pinned deliberately; a guard that never rejects is not a guard.
  it('accepts the supported format version', async () => {
    fakeMetadata = makeFull(SUPPORTED_FORMAT_VERSION);
    await expect(main(root)).resolves.toBeUndefined();
    expect(exit).not.toHaveBeenCalled();
  });

  it('refuses an unsupported format version instead of emitting plausible chunks', async () => {
    fakeMetadata = makeFull(SUPPORTED_FORMAT_VERSION + 1);
    await expect(main(root)).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`format version ${SUPPORTED_FORMAT_VERSION + 1}`),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`understands ${SUPPORTED_FORMAT_VERSION}`),
    );
  });

  it('writes nothing when the format version is rejected', async () => {
    fakeMetadata = makeFull(SUPPORTED_FORMAT_VERSION + 1);
    await expect(main(root)).rejects.toThrow();
    await expect(readdir(phonePaths(root).metadataDir)).rejects.toThrow();
  });

  it('prunes a stale chunk left behind by a shrinking country list', async () => {
    const { metadataDir } = phonePaths(root);
    await mkdir(metadataDir, { recursive: true });
    await writeFile(join(metadataDir, 'cc-99.generated.ts'), 'stale\n', 'utf8');

    await main(root);

    expect(await readdir(metadataDir)).not.toContain('cc-99.generated.ts');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1 stale removed'));
  });

  it('leaves a non-generated file in the metadata dir alone', async () => {
    const { metadataDir } = phonePaths(root);
    await mkdir(metadataDir, { recursive: true });
    await writeFile(join(metadataDir, 'index.ts'), 'export {};\n', 'utf8');

    await main(root);

    expect(await readdir(metadataDir)).toContain('index.ts');
  });
});
