/**
 * Everything a chrome generator does except the rendering itself: pulling the
 * Declarative Shadow DOM template out of an SSR render, emitting the generated
 * TypeScript module that holds it, and the generator loop around both.
 *
 * The six generators (`gen-{accordion,carousel,dropdown,navbar,shell,
 * light-styles}-chrome.mjs`) each used to run that loop at module scope, behind
 * a static DOM-shim import and a top-level `await import()` of a built `dist/`
 * bundle. Importing one from a spec therefore needed a prior build and mutated
 * globals process-wide, so none of it was reachable. Now each exports a
 * `main()` that takes its RENDERER as a parameter: a spec hands it a fake, and
 * the real @lit-labs/ssr renderer (`lit-renderer.mjs`) is created only when no
 * renderer is given — which is exactly the `node tools/lit-ssr-utils/...` run.
 *
 * This file is deliberately `.mjs` and deliberately inside `lit-ssr-utils/`:
 * `tools/vitest.config.ts` scopes `coverage.include` by extension AND
 * directory, so a `.ts` helper — or one placed elsewhere — would leave the
 * denominator, and coverage would rise while nothing new was tested.
 */
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * @typedef {{ html: (strings: TemplateStringsArray, ...values: any[]) => any, render: (template: any) => Promise<string> }} ChromeRenderer
 * @typedef {(path: string, content: string, encoding: 'utf8') => Promise<unknown>} WriteFn
 * @typedef {(...args: any[]) => void} LogFn
 * @typedef {{ repoRoot?: string, renderer?: ChromeRenderer, write?: WriteFn, log?: LogFn, error?: LogFn }} GeneratorOptions
 */

export const REPO_ROOT =resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');

/**
 * The number of pre-rendered count variants a chrome table holds.
 *
 * Index 0 doubles as the over-cap fallback: styled and visible, with children
 * rendering through the default slot, but without the input machine. That is
 * honest Tier-2 — visible but inert — rather than a component that looks
 * interactive and is not.
 */
export const MAX_CHROME_COUNT = 12;

/** The `file:` URL of a built web-component entry, as the generators import it. */
export function distEntryUrl(repoRoot, name) {
  return pathToFileURL(resolve(repoRoot, `dist/libs/mintplayer-web-components/${name}/index.mjs`))
    .href;
}

/** Where a component's generated chrome module lives. */
export function chromeOutPath(repoRoot, component, fileName) {
  return resolve(repoRoot, `libs/mintplayer-web-components/${component}/ssr/${fileName}`);
}

/** The DSD template in an SSR render, or null when the element produced no shadow root. */
export function extractDsdTemplate(rendered) {
  const match = String(rendered ?? '').match(
    /<template[^>]*shadowrootmode[^>]*>[\s\S]*?<\/template>/,
  );
  return match ? match[0] : null;
}

/** `export const NAME = "<chrome>";` */
export function chromeConstant(name, chrome, doc) {
  return `${docComment(doc)}export const ${name} = ${JSON.stringify(chrome)};`;
}

/**
 * `export const NAME: readonly string[] = [...];`
 *
 * The annotation is load-bearing: without it the emitted array widens to
 * `string[]` and a consumer can push into a table that is meant to be a
 * compile-time constant.
 */
export function chromeArrayConstant(name, chromes, doc) {
  return `${docComment(doc)}export const ${name}: readonly string[] = ${JSON.stringify(chromes)};`;
}

function docComment(doc) {
  return doc ? `/** ${doc} */\n` : '';
}

/**
 * The complete generated module: the do-not-edit header naming the command that
 * regenerates it, then the declarations.
 *
 * The header is the only thing standing between this file and someone editing a
 * generated artifact by hand, so `generator` is required rather than optional.
 */
export function buildChromeModule({ generator, source, declarations }) {
  return `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node tools/lit-ssr-utils/${generator}
// Source: ${source}

${declarations.join('\n')}
`;
}

/**
 * A failure a generator reports and exits 1 on, rather than a crash: `message`
 * is printed after the generator's name, `details` as further console.error
 * arguments (the offending render, typically).
 */
export class ChromeGeneratorError extends Error {
  constructor(message, ...details) {
    super(message);
    this.name = 'ChromeGeneratorError';
    this.details = details;
  }
}

/**
 * Bind a renderer (`{ render(template) → Promise<string> }`) into the one
 * operation every DSD generator repeats: render, extract the shadow template,
 * and refuse to continue without one — chrome that is silently empty would
 * ship a broken no-JS page.
 */
export function dsdChromeOf(renderer) {
  return async (template, what) => {
    const full = await renderer.render(template);
    const chrome = extractDsdTemplate(full);
    if (!chrome) throw new ChromeGeneratorError(`no DSD <template> for ${what}:\n`, full);
    return chrome;
  };
}

/**
 * `items.map(fn)` for an async `fn`, one call at a time and in order — the SSR
 * renders the generators ran in a loop, without the loop.
 */
export function mapSequential(items, fn) {
  return items.reduce(async (done, item) => [...(await done), await fn(item)], Promise.resolve([]));
}

/**
 * One `export const` per element, for the generators whose chrome does not vary
 * per instance (dropdown, navbar): each `{ tag, constant, template }` is
 * rendered in order and its size logged.
 */
export function staticChromeConstants({ generator, chromeOf, elements, log = console.log }) {
  return mapSequential(elements, async ({ tag, constant, template }) => {
    const chrome = await chromeOf(template, `<${tag}>`);
    log(`${generator}: <${tag}> chrome ${chrome.length} chars`);
    return chromeConstant(constant, chrome);
  });
}

/**
 * The generator loop: `build()` produces the declarations, the module is written
 * to `out`, and the exit code is returned. A `ChromeGeneratorError` from
 * `build()` is reported and yields 1 with NOTHING written, so a failed render
 * never replaces a good generated file with a half one. Any other error is a
 * bug and propagates.
 *
 * `build()` may return `{ declarations, note }`; `note` is appended to the
 * "wrote" line.
 */
export async function runChromeGenerator({
  generator,
  source,
  out,
  build,
  write,
  log = console.log,
  error = console.error,
}) {
  let built;
  try {
    built = await build();
  } catch (err) {
    if (!(err instanceof ChromeGeneratorError)) throw err;
    error(`${generator}: ${err.message}`, ...err.details);
    return 1;
  }
  const { declarations, note = '' } = built;
  await write(out, buildChromeModule({ generator: `${generator}.mjs`, source, declarations }), 'utf8');
  log(`${generator}: wrote ${out}${note}`);
  return 0;
}
