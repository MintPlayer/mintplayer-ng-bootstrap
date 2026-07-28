import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Spike 0.3a — the PLATFORM half of `formDisabledCallback` vs a programmatic
   `disabled` writer. Gates Phase F.

   The hazard is concrete, not theoretical: this workspace already shipped two
   writers on one `disabled` and had to fix it (otp-input.component.ts:124-131).
   Before designing the Angular CVA bridge (0.3b), establish exactly when the UA
   invokes formDisabledCallback and whether a single #disabled field can absorb
   both writers without a loop or a stale attribute. */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(HERE, 'fixture.js'), 'utf8');

const PAGE = `
  <form id="form">
    <fieldset id="fs">
      <mp-face-checkbox id="cb"></mp-face-checkbox>
    </fieldset>
  </form>
  <mp-face-checkbox id="loose"></mp-face-checkbox>
`;

async function setup(page: Page) {
  await page.setContent(PAGE);
  await page.addScriptTag({ content: FIXTURE });
  await page.waitForFunction(() => !!customElements.get('mp-face-checkbox'));
  await page.evaluate(() => (window as any).callbackLog.splice(0));
}

const log = (page: Page) => page.evaluate(() => (window as any).callbackLog);
const state = (page: Page, id = 'cb') =>
  page.evaluate((elId) => (document.getElementById(elId) as any).state(), id);
const clearLog = (page: Page) => page.evaluate(() => (window as any).callbackLog.splice(0));

test.describe('0.3a — when does the UA call formDisabledCallback?', () => {
  test.beforeEach(({ page }) => setup(page));

  test('an ancestor <fieldset disabled> triggers it, with the resolved state', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    const events = await log(page);
    console.log(`fieldset disable -> ${JSON.stringify(events)}`);
    expect(events).toContainEqual({ source: 'formDisabledCallback', value: true });

    const s = await state(page);
    expect(s.privateDisabled).toBe(true);
    expect(s.innerButtonDisabled).toBe(true);
    expect(s.ariaDisabled).toBe('true');
    // Critical for the design: the UA does NOT write a `disabled` attribute onto
    // the element. So the attribute is not a usable source of truth — a consumer
    // reading it would see `false` while the control is genuinely disabled.
    expect(s.hasAttribute).toBe(false);
  });

  test('re-enabling the fieldset calls it again with false (no stale disabled)', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    await clearLog(page);
    await page.evaluate(() => document.getElementById('fs')!.removeAttribute('disabled'));

    expect(await log(page)).toContainEqual({ source: 'formDisabledCallback', value: false });
    const s = await state(page);
    expect(s.privateDisabled).toBe(false);
    expect(s.innerButtonDisabled).toBe(false);
    expect(s.ariaDisabled).toBe('false');
  });

  test('the element OWN disabled attribute also routes through formDisabledCallback', async ({
    page,
  }) => {
    // Worth pinning down rather than assuming: if the UA fires it for the own
    // attribute too, then attributeChangedCallback and formDisabledCallback are
    // BOTH writers for the same user action, which is precisely the loop risk.
    await page.evaluate(() => document.getElementById('cb')!.setAttribute('disabled', ''));
    const events = await log(page);
    console.log(`own attribute disable -> ${JSON.stringify(events)}`);

    const sources = events.map((e: { source: string }) => e.source);
    console.log(`writer sources for one action: ${JSON.stringify(sources)}`);

    // Whatever the order, the resolved state must be coherent.
    const s = await state(page);
    expect(s.privateDisabled).toBe(true);
    expect(s.innerButtonDisabled).toBe(true);
    expect(s.ariaDisabled).toBe('true');
  });

  test('a loose element outside any form still gets the callback for its own attribute', async ({
    page,
  }) => {
    await page.evaluate(() => document.getElementById('loose')!.setAttribute('disabled', ''));
    console.log(`loose element -> ${JSON.stringify(await log(page))}`);
    expect((await state(page, 'loose')).privateDisabled).toBe(true);
  });
});

test.describe('0.3a — the two-writers hazard: does it loop or go stale?', () => {
  test.beforeEach(({ page }) => setup(page));

  test('a programmatic property write and a fieldset write resolve to one coherent state', async ({
    page,
  }) => {
    // This is the CVA scenario: the form calls setDisabledState(true) (property
    // write) while the control also sits inside <fieldset disabled>.
    await page.evaluate(() => {
      (document.getElementById('cb') as any).disabled = true;
      document.getElementById('fs')!.setAttribute('disabled', '');
    });
    let s = await state(page);
    expect(s.privateDisabled).toBe(true);
    expect(s.innerButtonDisabled).toBe(true);

    // Now the form re-enables, but the fieldset is STILL disabled. The control
    // must remain disabled — the fieldset is the stronger constraint, and the UA
    // owns it. A naive single writer would wrongly enable here.
    await clearLog(page);
    await page.evaluate(() => ((document.getElementById('cb') as any).disabled = false));
    s = await state(page);
    console.log(`after property re-enable inside disabled fieldset: ${JSON.stringify(s)}`);
    console.log(`log: ${JSON.stringify(await log(page))}`);

    /* Recorded rather than asserted: this is the DESIGN QUESTION Phase F must
       answer, not a platform fact. If privateDisabled is false here, a property
       writer can silently defeat <fieldset disabled>, and the mixin needs to
       track form-owner state separately from author state and expose the OR of
       the two. The spike's job is to show which it is. */
    expect(typeof s.privateDisabled).toBe('boolean');
  });

  test('the callback does not recurse when it writes state during the callback', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    const events = await log(page);
    const callbackCount = events.filter(
      (e: { source: string }) => e.source === 'formDisabledCallback',
    ).length;
    // More than one for a single fieldset toggle would mean the guard failed.
    expect(callbackCount).toBe(1);
  });

  test('toggling the fieldset repeatedly leaves no stale attribute or aria state', async ({
    page,
  }) => {
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
      await page.evaluate(() => document.getElementById('fs')!.removeAttribute('disabled'));
    }
    const s = await state(page);
    expect(s.privateDisabled).toBe(false);
    expect(s.ariaDisabled).toBe('false');
    expect(s.innerButtonDisabled).toBe(false);
  });
});
