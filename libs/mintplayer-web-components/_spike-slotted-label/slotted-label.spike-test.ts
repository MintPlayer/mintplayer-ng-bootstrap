import { test, expect, type CDPSession, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Spike: how much must a consumer type to get a named control?
   Measured against Chromium's real accessibility tree via CDP. */

const HERE = dirname(fileURLToPath(import.meta.url));

let bundlePromise: Promise<string> | undefined;
function bundle(): Promise<string> {
  bundlePromise ??= build({
    entryPoints: [join(HERE, 'entry.ts')],
    bundle: true,
    format: 'iife',
    write: false,
    target: 'es2022',
  }).then((r) => r.outputFiles[0].text);
  return bundlePromise;
}

const PAGE = `
  <mp-checkbox id="cb-slotted">Accept terms</mp-checkbox>
  <mp-checkbox id="cb-bare"></mp-checkbox>
  <mp-checkbox id="cb-input-label" input-label="From property">Visible text</mp-checkbox>
  <mp-slotted-label-control id="a">Slotted text</mp-slotted-label-control>
  <mp-shadow-label-control id="b"></mp-shadow-label-control>
  <mp-for-label-control id="c"></mp-for-label-control>
  <mp-select id="sel-bare"><option value="be">Belgium</option></mp-select>
`;

type AxNode = { role?: { value?: string }; name?: { value?: string }; ignored?: boolean };

async function axOf(session: CDPSession, expression: string): Promise<AxNode | undefined> {
  const { result } = (await session.send('Runtime.evaluate', { expression })) as {
    result: { objectId?: string };
  };
  if (!result.objectId) throw new Error(`no objectId for: ${expression}`);
  const { nodes } = (await session.send('Accessibility.queryAXTree', {
    objectId: result.objectId,
  })) as { nodes: AxNode[] };
  return nodes.find((n) => !n.ignored) ?? nodes[0];
}

/** The accessible name of the control inside a component's shadow root. */
const innerOf = (id: string) => `document.getElementById('${id}').shadowRoot.querySelector('input,select')`;

test.describe('does slotted light-DOM text name a shadow-DOM control?', () => {
  let session: CDPSession;

  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.setContent(PAGE);
    await page.addScriptTag({ content: await bundle() });
    await page.waitForFunction(() => !!customElements.get('mp-checkbox'));
    await page.waitForTimeout(50);
    session = await page.context().newCDPSession(page);
    await session.send('Accessibility.enable');
  });

  test.afterEach(async () => {
    await session.detach().catch(() => void 0);
  });

  test('baseline: <label for> inside one shadow root names the input', async () => {
    // Positive control for the harness. If this fails, nothing else here means anything.
    const ax = await axOf(session, innerOf('c'));
    console.log(`C label-for      → ${JSON.stringify(ax?.name?.value)}`);
    expect(ax?.name?.value).toBe('For text');
  });

  test('baseline: wrapping <label> with shadow text names the input', async () => {
    const ax = await axOf(session, innerOf('b'));
    console.log(`B shadow text    → ${JSON.stringify(ax?.name?.value)}`);
    expect(ax?.name?.value).toBe('Shadow text');
  });

  test('THE QUESTION: wrapping <label> with SLOTTED text', async () => {
    const ax = await axOf(session, innerOf('a'));
    console.log(`A slotted text   → ${JSON.stringify(ax?.name?.value)}`);
    // Recorded, not asserted — this test exists to establish the answer, and
    // asserting a guess would just encode the guess.
    expect(typeof (ax?.name?.value ?? '')).toBe('string');
  });

  test('the real mp-checkbox with slotted text', async () => {
    const ax = await axOf(session, innerOf('cb-slotted'));
    console.log(`mp-checkbox slot → ${JSON.stringify(ax?.name?.value)} role=${ax?.role?.value}`);
    expect(typeof (ax?.name?.value ?? '')).toBe('string');
  });

  test('the real mp-checkbox with nothing at all', async () => {
    const ax = await axOf(session, innerOf('cb-bare'));
    console.log(`mp-checkbox bare → ${JSON.stringify(ax?.name?.value)}`);
    expect(typeof (ax?.name?.value ?? '')).toBe('string');
  });

  test('input-label vs slotted text — which wins', async () => {
    const ax = await axOf(session, innerOf('cb-input-label'));
    console.log(`mp-checkbox both → ${JSON.stringify(ax?.name?.value)}`);
    expect(typeof (ax?.name?.value ?? '')).toBe('string');
  });

  test('mp-select with no label of any kind', async () => {
    // The audit's "no fallback naming path at all" claim, measured.
    const ax = await axOf(session, innerOf('sel-bare'));
    console.log(`mp-select bare   → ${JSON.stringify(ax?.name?.value)} role=${ax?.role?.value}`);
    expect(typeof (ax?.name?.value ?? '')).toBe('string');
  });
});
