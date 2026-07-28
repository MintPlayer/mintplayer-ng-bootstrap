import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Spike 0.4 — `inert` through slots, plus the two RovingFocus claims that no unit
   test can reach. Gates Phase D's carousel fix, and VERIFIES CODE PHASE A ALREADY
   SHIPPED: inert-regions.spec.ts can only assert the attribute lands, because
   jsdom does not implement inert's focusability effect at all.

   Real Tab is used throughout. page.keyboard.press('Tab') goes through
   Input.dispatchKeyEvent, producing a TRUSTED event — the only way to move focus
   sequentially. A constructed KeyboardEvent moves focus in no environment,
   browsers included, because untrusted events do not run default actions. */

const HERE = dirname(fileURLToPath(import.meta.url));

/** Bundle the real primitives once per run, so the page runs shipped source. */
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
  <button id="before">before</button>
  <mp-slot-wrapper id="wrapper">
    <button id="slotted">slotted light DOM</button>
  </mp-slot-wrapper>
  <button id="after">after</button>

  <hr>
  <button id="pre-list">pre-list</button>
  <mp-roving-list id="list"></mp-roving-list>
  <button id="post-list">post-list</button>

  <hr>
  <div dir="rtl">
    <button id="pre-rtl">pre-rtl</button>
    <mp-roving-list id="rtl-list"></mp-roving-list>
  </div>
`;

async function setup(page: Page) {
  await page.setContent(PAGE);
  await page.addScriptTag({ content: await bundle() });
  await page.waitForFunction(() => !!window.spike);
}

/** Where is focus really, descending shadow roots? */
const deepActive = (page: Page) => page.evaluate(() => window.spike.deepActive());

test.describe('0.4 — inert propagates through slots (the load-bearing claim)', () => {
  test.beforeEach(({ page }) => setup(page));

  test('a slotted button is reachable by Tab while the wrapper is not inert', async ({ page }) => {
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    expect(await deepActive(page)).toContain('#slotted');
  });

  test('inerting the SHADOW wrapper removes the SLOTTED light-DOM button from the tab order', async ({
    page,
  }) => {
    await page.evaluate(() => window.spike.hide());
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    // The whole point: inert crossed the slot boundary, so Tab skipped straight
    // past the consumer's content without us walking assignedElements().
    expect(await deepActive(page)).toContain('#after');
  });

  test('the slotted button is absent from the accessibility tree while inert', async ({ page }) => {
    await page.evaluate(() => window.spike.hide());
    const snapshot = await page.locator('body').ariaSnapshot();
    expect(snapshot).not.toContain('slotted light DOM');
  });

  test('releasing the inert set restores both focusability and AX exposure', async ({ page }) => {
    await page.evaluate(() => window.spike.hide());
    await page.evaluate(() => window.spike.show());
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    expect(await deepActive(page)).toContain('#slotted');
    expect(await page.locator('body').ariaSnapshot()).toContain('slotted light DOM');
  });

  test('focus is rescued rather than dropped to <body> when the focused node is inerted', async ({
    page,
  }) => {
    await page.locator('#slotted').focus();
    await page.evaluate(() => window.spike.hide());
    // Applying inert to an ancestor of the focused element blurs it to <body>;
    // inertRegions() moves focus out deliberately first.
    expect(await deepActive(page)).not.toContain('body');
  });
});

test.describe('0.4 — RovingFocus: the one-tab-stop invariant (unreachable in any unit test)', () => {
  test.beforeEach(({ page }) => setup(page));

  test('Tab into the widget lands on exactly one item; one more Tab leaves it entirely', async ({
    page,
  }) => {
    await page.locator('#pre-list').focus();

    await page.keyboard.press('Tab');
    expect(await deepActive(page)).toContain('one');

    await page.keyboard.press('Tab');
    // Not item two, three or four — the whole widget is a single tab stop.
    expect(await deepActive(page)).toContain('#post-list');
  });

  test('arrows move within the widget, and the tab stop follows, skipping disabled', async ({
    page,
  }) => {
    await page.locator('#pre-list').focus();
    await page.keyboard.press('Tab');

    await page.keyboard.press('ArrowDown');
    // item two is aria-disabled, so ArrowDown must land on three
    expect(await deepActive(page)).toContain('three');
    expect(await page.evaluate(() => window.spike.activeIndex())).toBe(2);

    // Leaving and re-entering resumes at the moved tab stop, not back at item one.
    await page.keyboard.press('Tab');
    expect(await deepActive(page)).toContain('#post-list');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    expect(await deepActive(page)).toContain('three');
  });

  test('clamping at the end does not escape the widget', async ({ page }) => {
    await page.locator('#pre-list').focus();
    await page.keyboard.press('Tab');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown');
    expect(await deepActive(page)).toContain('four');
  });
});

test.describe('0.4 — RovingFocus: RTL arrow inversion (jsdom cannot resolve direction)', () => {
  test.beforeEach(({ page }) => setup(page));

  test('under dir=rtl, ArrowLeft moves FORWARD through the items', async ({ page }) => {
    await page.locator('#pre-rtl').focus();
    await page.keyboard.press('Tab');
    expect(await deepActive(page)).toContain('one');

    await page.keyboard.press('ArrowLeft');
    // Mirrored layout: visually-leftward is forward. Skips the disabled item.
    expect(await deepActive(page)).toContain('three');
  });

  test('under dir=rtl, ArrowRight moves BACKWARD', async ({ page }) => {
    await page.locator('#pre-rtl').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowLeft');
    expect(await deepActive(page)).toContain('three');

    await page.keyboard.press('ArrowRight');
    expect(await deepActive(page)).toContain('one');
  });

  test('the LTR widget on the same page is unaffected', async ({ page }) => {
    await page.locator('#pre-list').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowLeft');
    // Nowhere to go backwards from index 0 with wrap disabled.
    expect(await deepActive(page)).toContain('one');
  });
});
