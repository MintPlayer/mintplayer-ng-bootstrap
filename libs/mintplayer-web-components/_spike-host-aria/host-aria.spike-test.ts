import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Spike 0.2 — host naming via ElementInternals. Gates ALL of Phase B.
   Phase A already shipped HostAriaController against these assumptions.

   METHODOLOGY (established by probe.spike.spec.ts, do not skip):
   Playwright's ariaSnapshot()/toHaveAccessibleName() are computed by Playwright's
   OWN injected accname implementation, which cannot read another element's
   ElementInternals. It reports NO role for an internals-only host even where the
   browser does expose one — so it is structurally incapable of answering 0.2a and
   is not used as evidence here. `page.accessibility.snapshot()`, which used to be
   backed by each engine's real AX tree, was REMOVED in Playwright 1.60.
   Therefore: the authoritative assertions are Chromium-only, via CDP
   Accessibility.queryAXTree. Firefox and WebKit get property-plumbing assertions
   (necessary, not sufficient) plus a documented manual-SR check. */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(HERE, 'fixture.js'), 'utf8');

const PAGE = `
  <label id="outer-label">Country</label>
  <mp-role-host id="role-host" aria-label="Country"></mp-role-host>
  <mp-listbox-host id="listbox-host" aria-label="Country"></mp-listbox-host>
  <mp-no-role-host id="no-role-host" aria-label="Country"></mp-no-role-host>
  <mp-attr-role-host id="attr-role-host" role="group" aria-label="Country"></mp-attr-role-host>
  <mp-ref-host id="ref-host"></mp-ref-host>
  <mp-str-host id="str-host"></mp-str-host>
  <mp-internals-ref-host id="internals-ref-host"></mp-internals-ref-host>
`;

async function build(page: Page) {
  await page.setContent(PAGE);
  await page.addScriptTag({ content: FIXTURE });
  await page.waitForFunction(() => !!customElements.get('mp-internals-ref-host'));
}

type AxNode = { role?: { value?: string }; name?: { value?: string }; ignored?: boolean };

/** Real Chromium AX node for the element returned by `expression`. */
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

test.describe('0.2 — authoritative AX assertions (Chromium only, real AX tree)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Real AX tree is only reachable via CDP');

  let session: CDPSession;

  test.beforeEach(async ({ page }) => {
    await build(page);
    session = await page.context().newCDPSession(page);
    await session.send('Accessibility.enable');
  });

  test.afterEach(async () => {
    await session.detach().catch(() => void 0);
  });

  test('0.2a — a role set ONLY via internals.role makes the host nameable', async () => {
    const ax = await axOf(session, `document.getElementById('role-host')`);
    console.log(`0.2a role-host AX: ${JSON.stringify(ax)}`);
    expect(ax?.role?.value).toBe('group');
    expect(ax?.name?.value).toBe('Country');
  });

  test('0.2a — holds for a widget role too (listbox)', async () => {
    const ax = await axOf(session, `document.getElementById('listbox-host')`);
    console.log(`0.2a listbox-host AX: ${JSON.stringify(ax)}`);
    expect(ax?.role?.value).toBe('listbox');
    expect(ax?.name?.value).toBe('Country');
  });

  /* SURPRISE — read before quoting the PRD on this.
     The expected result was "no role => name prohibited => discarded". Chromium
     does NOT enforce the prohibition: a role-less host computes role `generic`
     AND name "Country". So the defect is NOT that the name is thrown away.

     What IS true, and is what Phase B actually rests on: the host stays
     `generic`, and a generic node is not an object AT navigates to or announces
     as a named thing, so the name has nowhere to surface. Note Playwright's own
     accname implementation — which follows ARIA 1.2 — DOES drop it, which is
     evidence about the spec rather than about any shipping engine.

     Consequence for the docs: the argument must be "a generic host has no role
     for a name to attach to", never "the name is discarded". Asserting on ROLE
     keeps this test true in engines that do implement the prohibition. */
  test('0.2a control — with NO role the host is `generic` (nothing for a name to attach to)', async () => {
    const ax = await axOf(session, `document.getElementById('no-role-host')`);
    console.log(`0.2a no-role-host AX: ${JSON.stringify(ax)}`);
    expect(ax?.role?.value).toBe('generic');
  });

  test('0.2a control — a role ATTRIBUTE also works (the documented fallback)', async () => {
    const ax = await axOf(session, `document.getElementById('attr-role-host')`);
    expect(ax?.role?.value).toBe('group');
    expect(ax?.name?.value).toBe('Country');
  });

  test('0.2b — ariaLabelledByElements resolves inner shadow node -> outer document label', async () => {
    const ax = await axOf(
      session,
      `document.getElementById('ref-host').shadowRoot.getElementById('inner-input')`,
    );
    console.log(`0.2b element-refs AX: ${JSON.stringify(ax)}`);
    expect(ax?.name?.value).toBe('Country');
  });

  test('0.2b negative — the same relationship as an IDREF string resolves to nothing', async () => {
    const ax = await axOf(
      session,
      `document.getElementById('str-host').shadowRoot.getElementById('inner-input-str')`,
    );
    console.log(`0.2b idref-string AX: ${JSON.stringify(ax)}`);
    expect(ax?.name?.value ?? '').not.toBe('Country');
  });

  test('0.2b — internals.ariaLabelledByElements names the host from an outer label', async () => {
    const ax = await axOf(session, `document.getElementById('internals-ref-host')`);
    console.log(`0.2b internals-refs AX: ${JSON.stringify(ax)}`);
    expect(ax?.name?.value).toBe('Country');
  });
});

test.describe('0.2 — property plumbing (all engines; necessary, not sufficient)', () => {
  test('ElementInternals ARIA surface exists and assignments stick', async ({ page }) => {
    await build(page);
    const result = await page.evaluate(() => {
      const host = document.getElementById('internals-ref-host') as HTMLElement & {
        internals: ElementInternals;
      };
      const refInput = (document.getElementById('ref-host') as HTMLElement).shadowRoot!.getElementById(
        'inner-input',
      )!;
      const outer = document.getElementById('outer-label');
      return {
        roleSticks: host.internals.role,
        internalsHasRefs: 'ariaLabelledByElements' in host.internals,
        elementHasRefs: 'ariaLabelledByElements' in refInput,
        crossRootRefIdentity:
          ((refInput as unknown as { ariaLabelledByElements?: Element[] }).ariaLabelledByElements ??
            [])[0] === outer,
      };
    });
    expect(result.roleSticks).toBe('group');
    expect(result.internalsHasRefs).toBe(true);
    expect(result.elementHasRefs).toBe(true);
    // A cross-root reference must be retained as a live element reference, not
    // silently dropped the way an IDREF string is.
    expect(result.crossRootRefIdentity).toBe(true);
  });

  test('supportsAriaElementReferences() feature detection agrees with reality', async ({ page }) => {
    await build(page);
    // Mirrors a11y/src/host-aria.ts's detection so Phase A's fallback path is
    // known to be dead code in all three current engines rather than untested.
    const supported = await page.evaluate(
      () => 'ariaLabelledByElements' in Element.prototype && 'ariaLabelledByElements' in ElementInternals.prototype,
    );
    expect(supported).toBe(true);
  });
});
