import type { Locator, Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

export interface AccordionSuiteOptions {
  /** Demo page path (all three apps use /enterprise/accordion). */
  path?: string;
}

const PATH = '/enterprise/accordion';

const single = (page: Page) => page.locator('[data-demo="single"] mp-accordion');
const multi = (page: Page) => page.locator('[data-demo="multi"] mp-accordion');
const nested = (page: Page) => page.locator('[data-demo="nested"] mp-accordion').first();

const item = (accordion: Locator, index: number) =>
  accordion.locator(`details.accordion-item >> nth=${index}`);
const summary = (accordion: Locator, index: number) =>
  accordion.locator(`summary.accordion-button >> nth=${index}`);
const content = (accordion: Locator, index: number) =>
  accordion.locator(`.accordion-content >> nth=${index}`);

/**
 * JS-enabled behavior suite. Readiness is a deterministic shadow predicate
 * (not networkidle — the dev server's HMR socket hangs it on Firefox), per the
 * carousel/navbar precedent.
 *
 * D1: both tiers render the same `<details name>` template; the UA owns
 * disclosure state, and `open` is the reflected source of truth these tests
 * read (never toggle-event counting — spike 0.1a).
 */
export function accordionJsSuite(test: Test, expect: Expect, options: AccordionSuiteOptions = {}) {
  const path = options.path ?? PATH;

  async function goto(page: Page) {
    await page.goto(path);
    await page.waitForFunction(() => {
      const accordion = document.querySelector('mp-accordion');
      // data-js only exists after connectedCallback — i.e. after hydration
      // replaced the server DOM. Without it the DSD chrome satisfies the
      // structural checks and the element detaches mid-test.
      return !!(
        accordion &&
        accordion.hasAttribute('data-js') &&
        accordion.shadowRoot?.querySelector('summary.accordion-button') &&
        accordion.querySelector('[accordion-tab]')?.assignedSlot
      );
    });
  }

  test.describe('accordion (JS)', () => {
    test('hydrates into the details tier, once', async ({ page }) => {
      await goto(page);
      const counts = await single(page).evaluate((el: Element) => {
        const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
        return {
          items: shadow.querySelectorAll('details.accordion-item').length,
          summaries: shadow.querySelectorAll('summary.accordion-button').length,
          // Pre-D1 machinery must not resurface in either tier.
          inputs: shadow.querySelectorAll('.acc-input').length,
          buttons: shadow.querySelectorAll('button').length,
        };
      });
      expect(counts).toEqual({ items: 3, summaries: 3, inputs: 0, buttons: 0 });
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

      // The inner accordion lives in the outer tab's body.
      const inner = page.locator('[data-demo="nested"] mp-accordion mp-accordion').first();
      await summary(inner, 0).click();
      await expect(item(inner, 0)).toHaveJSProperty('open', true);

      await summary(outer, 0).click();
      await expect(item(outer, 0)).toHaveJSProperty('open', false);
      await expect(item(inner, 0)).toHaveJSProperty('open', false);
    });

    test('exposes the disclosure structure and moves focus with the arrow keys', async ({ page }) => {
      await goto(page);
      const accordion = single(page);

      await expect(summary(accordion, 0)).toHaveAttribute('aria-controls', 'c0');
      await summary(accordion, 0).click(); // regions of closed details are hidden
      await expect(content(accordion, 0)).toHaveAttribute('role', 'region');
      await expect(content(accordion, 0)).toHaveAttribute('aria-labelledby', 'h0');

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
 * by the caller). With D1 the no-JS tier is the SAME details markup, fully
 * interactive through the UA: summaries are natively focusable and
 * Enter/Space-activatable, and `name` gives single-open exclusivity with no
 * script and no CSS state machine.
 */
export function accordionNojsSuite(test: Test, expect: Expect, options: AccordionSuiteOptions = {}) {
  const path = options.path ?? PATH;

  test.describe('accordion (no JS, DSD)', () => {
    // No `waitForLoadState('networkidle')`: the dev server holds an HMR
    // websocket open, so the network never goes idle and the wait burns its
    // full timeout on Firefox. Nothing here needs it either — everything
    // under test is in the server-rendered HTML, `goto` already waits for
    // `load`, and every assertion below auto-retries.
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('the DSD attaches server-side with native details rows in place', async ({ page }) => {
      const accordion = single(page);
      await expect(accordion.locator('details.accordion-item')).toHaveCount(3);
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
      // Tab reaches the next tab's summary natively; the open panel's content
      // sits between them in the tab order, so tab twice past the body link
      // count of this demo (plain text bodies — one Tab suffices).
      await summary(accordion, 1).focus();
      await page.keyboard.press('Enter');

      await expect(item(accordion, 0)).toHaveAttribute('open', '');
      await expect(item(accordion, 1)).toHaveAttribute('open', '');
    });

    test('two accordions on one page keep independent state (shadow-scoped name groups)', async ({ page }) => {
      // <details name> groups per node tree, so each accordion's own shadow
      // root scopes its group — opening a tab in one must leave every other
      // accordion alone. A single action plus pure assertions, per the
      // Chromium/no-JS actionability lesson from the carousel suite.
      await summary(single(page), 1).click();
      await expect(item(single(page), 1)).toHaveAttribute('open', '');
      await expect(item(multi(page), 0)).not.toHaveAttribute('open', '');
      await expect(item(multi(page), 1)).not.toHaveAttribute('open', '');
    });
  });
}
