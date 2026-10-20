import type { Locator, Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

export interface AccordionSuiteOptions {
  /** Demo page path (all three apps use /enterprise/accordion). */
  path?: string;
}

const PATH = '/enterprise/accordion';

// Every front renders the core's markup (#437): the root carries data-mps and
// the rows are its direct children — the Angular host and the React/Vue div
// alike. `:scope >` keeps a nested accordion's rows out of its parent's count.
const ROOT = '[data-mps="accordion"]';
const single = (page: Page) => page.locator(`[data-demo="single"] ${ROOT}`).first();
const multi = (page: Page) => page.locator(`[data-demo="multi"] ${ROOT}`).first();
const nested = (page: Page) => page.locator(`[data-demo="nested"] ${ROOT}`).first();

const item = (accordion: Locator, index: number) =>
  accordion.locator(`:scope > details.accordion-item >> nth=${index}`);
const summary = (accordion: Locator, index: number) =>
  item(accordion, index).locator(':scope > summary.accordion-button');
const content = (accordion: Locator, index: number) =>
  item(accordion, index).locator(':scope > .accordion-content');

/**
 * JS-enabled behavior suite. The server HTML is already a working accordion,
 * so "rendered" says nothing about "hydrated": readiness is behavioural —
 * End on the first header moves focus only once the front's keydown handler
 * is attached. Every front hydrates its whole tree at once, so one accordion
 * answering means every accordion on the page does. (Not networkidle — the
 * dev server's HMR socket hangs it on Firefox.)
 *
 * The UA owns disclosure state, and `open` is the reflected source of truth
 * these tests read (never toggle-event counting — spike 0.1a).
 */
export function accordionJsSuite(test: Test, expect: Expect, options: AccordionSuiteOptions = {}) {
  const path = options.path ?? PATH;

  async function goto(page: Page) {
    await page.goto(path);
    const accordion = single(page);
    await expect(async () => {
      await summary(accordion, 0).focus();
      await page.keyboard.press('End');
      await expect(summary(accordion, 2)).toBeFocused({ timeout: 250 });
    }).toPass();
  }

  test.describe('accordion (JS)', () => {
    test('hydrates the server rows in place, once', async ({ page }) => {
      await goto(page);
      const accordion = single(page);
      await expect(accordion.locator(':scope > details.accordion-item')).toHaveCount(3);
      await expect(accordion.locator('summary.accordion-button')).toHaveCount(3);
      await expect(accordion.locator('button')).toHaveCount(0);
    });

    test('a closed tab exposes no content at all', async ({ page }) => {
      // <details> removes closed content from rendering, the tab order and
      // the accessibility tree natively — the §4.5 Critical closed by
      // construction. Height 0 AND hidden.
      await goto(page);
      const accordion = single(page);
      await expect(content(accordion, 1)).toBeHidden();
      // toBeHidden above is the load-bearing check (out of paint, the tab
      // order and the a11y tree). The zero-height box is engine shape:
      // WebKit keeps a residual layout box (~40px) for closed details
      // content while still hiding it everywhere that matters.
      if (test.info().project.name !== 'webkit') {
        const box = await content(accordion, 1).boundingBox();
        expect(box?.height ?? 0).toBe(0);
      }
    });

    test('opens a tab on click and closes the previous one', async ({ page }) => {
      await goto(page);
      const accordion = single(page);

      await summary(accordion, 0).click();
      await expect(item(accordion, 0)).toHaveJSProperty('open', true);

      await summary(accordion, 1).click();
      await expect(item(accordion, 1)).toHaveJSProperty('open', true);
      await expect(item(accordion, 0)).toHaveJSProperty('open', false);
    });

    test('keeps several tabs open under multi', async ({ page }) => {
      await goto(page);
      const accordion = multi(page);
      await accordion.scrollIntoViewIfNeeded();

      await summary(accordion, 0).click();
      await summary(accordion, 2).click();
      await expect(item(accordion, 0)).toHaveJSProperty('open', true);
      await expect(item(accordion, 2)).toHaveJSProperty('open', true);
    });

    test('closing a tab collapses the accordion nested inside it', async ({ page }) => {
      await goto(page);
      const outer = nested(page);
      await outer.scrollIntoViewIfNeeded();

      await summary(outer, 0).click();
      await expect(item(outer, 0)).toHaveJSProperty('open', true);

      const inner = content(outer, 0).locator(ROOT).first();
      await summary(inner, 0).click();
      await expect(item(inner, 0)).toHaveJSProperty('open', true);

      await summary(outer, 0).click();
      await expect(item(outer, 0)).toHaveJSProperty('open', false);
      await expect(item(inner, 0)).toHaveJSProperty('open', false);
    });

    test('exposes the disclosure structure and moves focus with the arrow keys', async ({ page }) => {
      await goto(page);
      const accordion = single(page);

      await summary(accordion, 0).click(); // regions of closed details are hidden
      const regionId = await content(accordion, 0).getAttribute('id');
      const headerId = await summary(accordion, 0).getAttribute('id');
      await expect(summary(accordion, 0)).toHaveAttribute('aria-controls', regionId!);
      await expect(content(accordion, 0)).toHaveAttribute('role', 'region');
      await expect(content(accordion, 0)).toHaveAttribute('aria-labelledby', headerId!);

      await summary(accordion, 0).focus();
      await page.keyboard.press('ArrowDown');
      await expect(summary(accordion, 1)).toBeFocused();
      await page.keyboard.press('End');
      await expect(summary(accordion, 2)).toBeFocused();
      await page.keyboard.press('Home');
      await expect(summary(accordion, 0)).toBeFocused();
    });
  });
}

/**
 * No-JS suite (file-level `test.use({ javaScriptEnabled: false })` is applied
 * by the caller). The server HTML is the same details markup the client
 * renders, fully interactive through the UA: summaries are natively focusable
 * and Enter/Space-activatable, and `name` gives single-open exclusivity with
 * no script and no CSS state machine.
 */
export function accordionNojsSuite(test: Test, expect: Expect, options: AccordionSuiteOptions = {}) {
  const path = options.path ?? PATH;

  test.describe('accordion (no JS)', () => {
    // No `waitForLoadState('networkidle')`: the dev server holds an HMR
    // websocket open, so the network never goes idle and the wait burns its
    // full timeout on Firefox. Nothing here needs it either — everything
    // under test is in the server-rendered HTML, `goto` already waits for
    // `load`, and every assertion below auto-retries.
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('the server renders native details rows', async ({ page }) => {
      const accordion = single(page);
      await expect(accordion.locator(':scope > details.accordion-item')).toHaveCount(3);
      await expect(accordion.locator('summary.accordion-button')).toHaveCount(3);
      // Everything starts collapsed, and collapsed means the content is not
      // rendered at all — no padding strip, no readable text.
      await expect(item(accordion, 0)).not.toHaveAttribute('open', '');
      await expect(content(accordion, 0)).toBeHidden();
    });

    // At most ONE click per test from here on: Chromium with JS disabled
    // intermittently hangs the actionability stability wait when a test
    // switches click targets between elements (carousel suite lesson).
    // Everything after the first click is driven by focus + keyboard, which
    // skip that wait — and which is the no-JS keyboard story anyway.

    test('single-open: activating a header opens it and name-exclusivity closes the previous', async ({ page }) => {
      const accordion = single(page);
      await summary(accordion, 0).click();
      await expect(item(accordion, 0)).toHaveAttribute('open', '');

      await summary(accordion, 1).focus();
      await page.keyboard.press('Enter');
      await expect(item(accordion, 1)).toHaveAttribute('open', '');
      await expect(item(accordion, 0)).not.toHaveAttribute('open', '');
    });

    test('multi: summaries are keyboard-operable and stay open together', async ({ page }) => {
      const accordion = multi(page);
      await accordion.scrollIntoViewIfNeeded();

      await summary(accordion, 0).focus();
      await page.keyboard.press('Enter');
      await summary(accordion, 1).focus();
      await page.keyboard.press('Enter');

      await expect(item(accordion, 0)).toHaveAttribute('open', '');
      await expect(item(accordion, 1)).toHaveAttribute('open', '');
    });

    test('two accordions on one page keep independent state (per-accordion name groups)', async ({ page }) => {
      // Each accordion's rows share a name derived from its own id, so
      // opening a tab in one must leave every other accordion alone. A single
      // action plus pure assertions, per the Chromium/no-JS actionability
      // lesson from the carousel suite.
      await summary(single(page), 1).click();
      await expect(item(single(page), 1)).toHaveAttribute('open', '');
      await expect(item(multi(page), 0)).not.toHaveAttribute('open', '');
      await expect(item(multi(page), 1)).not.toHaveAttribute('open', '');
    });
  });
}
