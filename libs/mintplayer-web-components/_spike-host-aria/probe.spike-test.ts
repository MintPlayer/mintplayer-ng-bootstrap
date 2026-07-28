import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Methodology probe. Before asserting anything about accessible names, establish
   WHICH signal is authoritative in each engine.
   Playwright's toHaveAccessibleName()/ariaSnapshot() are computed by Playwright's
   own injected accname implementation, which cannot read another element's
   ElementInternals — so if it reports a name for an internals-only role, that
   tells us about Playwright, not about the browser. Only a real AX-tree read
   (CDP in Chromium) is authoritative. This probe records what exists. */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(HERE, 'fixture.js'), 'utf8');

const PAGE = `
  <label id="outer-label">Country</label>
  <button id="before">before</button>
  <mp-role-host id="role-host" aria-label="Country"></mp-role-host>
  <mp-listbox-host id="listbox-host" aria-label="Country"></mp-listbox-host>
  <mp-no-role-host id="no-role-host" aria-label="Country"></mp-no-role-host>
  <mp-attr-role-host id="attr-role-host" role="group" aria-label="Country"></mp-attr-role-host>
  <mp-ref-host id="ref-host"></mp-ref-host>
  <mp-str-host id="str-host"></mp-str-host>
  <mp-internals-ref-host id="internals-ref-host"></mp-internals-ref-host>
`;

test('probe: platform + tooling capabilities', async ({ page, browserName }) => {
  await page.setContent(PAGE);
  await page.addScriptTag({ content: FIXTURE });
  await page.waitForFunction(() => !!customElements.get('mp-role-host'));

  const platform = await page.evaluate(() => {
    const el = document.getElementById('ref-host') as HTMLElement & { internals?: ElementInternals };
    const withInternals = document.getElementById('internals-ref-host') as HTMLElement & {
      internals?: ElementInternals;
    };
    const input = el.shadowRoot!.getElementById('inner-input')!;
    const probe = document.createElement('div');
    return {
      attachInternals: typeof HTMLElement.prototype.attachInternals === 'function',
      ariaLabelledByElements_onElement: 'ariaLabelledByElements' in probe,
      ariaLabelledByElements_onInternals: withInternals.internals
        ? 'ariaLabelledByElements' in withInternals.internals
        : 'no-internals',
      internalsRefStuck: withInternals.internals
        ? ((withInternals.internals as any).ariaLabelledByElements ?? []).length
        : 'no-internals',
      internalsRoleStuck: withInternals.internals ? withInternals.internals.role : 'no-internals',
      // Testing-only AX surfaces, in case one is exposed in this build.
      windowInternals: 'internals' in window,
      accessibilityController: 'accessibilityController' in window,
      ariaDescribedByElements_onElement: 'ariaDescribedByElements' in probe,
      // Did the assignment actually stick, and does it survive as a live reference?
      refAssignmentStuck:
        'ariaLabelledByElements' in input
          ? ((input as any).ariaLabelledByElements ?? []).length
          : 'unsupported',
      refResolvesToOuterLabel:
        'ariaLabelledByElements' in input
          ? ((input as any).ariaLabelledByElements ?? [])[0] === document.getElementById('outer-label')
          : 'unsupported',
      computedRoleApi: 'computedRole' in probe,
      computedLabelApi: 'computedLabel' in probe,
    };
  });

  /* Playwright's page.accessibility.snapshot() was, before deprecation, backed by
     each engine's REAL AX tree (CDP / juggler / WebKit protocol) rather than the
     injected accname script. If it still exists in 1.60 it is the only
     cross-engine authoritative signal available. */
  const legacyApi = (page as unknown as { accessibility?: { snapshot?: unknown } }).accessibility;
  let legacy: unknown = 'page.accessibility absent';
  if (legacyApi && typeof legacyApi.snapshot === 'function') {
    try {
      legacy = await (legacyApi as { snapshot: () => Promise<unknown> }).snapshot();
    } catch (err) {
      legacy = `FAILED: ${(err as Error).message}`;
    }
  }

  let cdp: unknown = 'unavailable (non-chromium)';
  if (browserName === 'chromium') {
    try {
      const session = await page.context().newCDPSession(page);
      await session.send('Accessibility.enable');
      const tree = (await session.send('Accessibility.getFullAXTree')) as { nodes: unknown[] };
      cdp = `available, ${tree.nodes.length} AX nodes`;
      await session.detach();
    } catch (err) {
      cdp = `FAILED: ${(err as Error).message}`;
    }
  }

  // What does Playwright's own computation say? Recorded, not trusted.
  const pwNames: Record<string, string> = {};
  for (const id of ['role-host', 'no-role-host', 'attr-role-host']) {
    pwNames[id] = await page
      .locator(`#${id}`)
      .evaluate((el) => el.getAttribute('aria-label') ?? '')
      .catch(() => '<err>');
  }
  const ariaSnapshot = await page.locator('body').ariaSnapshot();

  console.log(
    `\n=== PROBE [${browserName}] ===\n` +
      `platform: ${JSON.stringify(platform, null, 2)}\n` +
      `cdp AX tree: ${cdp}\n` +
      `page.accessibility.snapshot(): ${typeof legacy === 'string' ? legacy : JSON.stringify(legacy, null, 2)}\n` +
      `playwright ariaSnapshot(body):\n${ariaSnapshot}\n`,
  );

  expect(platform.attachInternals).toBe(true);
});
