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

const button = (accordion: Locator, index: number) =>
  accordion.locator(`.accordion-button >> nth=${index}`);
const region = (accordion: Locator, index: number) =>
  accordion.locator(`.accordion-collapse >> nth=${index}`);
/** The no-JS state store: one visually-hidden input per tab. */
const input = (accordion: Locator, index: number) =>
  accordion.locator(`.acc-input >> nth=${index}`);

/**
 * JS-enabled behavior suite. Readiness is a deterministic shadow predicate
 * (not networkidle — the dev server's HMR socket hangs it on Firefox), per the
 * carousel/navbar precedent.
 */
export function accordionJsSuite(test: Test, expect: Expect, options: AccordionSuiteOptions = {}) {
  const path = options.path ?? PATH;

  async function goto(page: Page) {
    await page.goto(path);
    await page.waitForFunction(() => {
      const accordion = document.querySelector('mp-accordion');
      return !!(
        accordion &&
        accordion.hasAttribute('data-js') &&
        accordion.shadowRoot?.querySelector('.accordion-button') &&
        accordion.querySelector('[accordion-tab]')?.assignedSlot
      );
    });
  }

  test.describe('accordion (JS)', () => {
    test('replaces the SSR chrome with the button tier, once', async ({ page }) => {
      await goto(page);
      const counts = await single(page).evaluate((el: Element) => {
        const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
        return {
          items: shadow.querySelectorAll('.accordion-item').length,
          buttons: shadow.querySelectorAll('button.accordion-button').length,
          // The no-JS inputs must be gone — they were the server's tier.
          inputs: shadow.querySelectorAll('.acc-input').length,
        };
      });
      expect(counts).toEqual({ items: 3, buttons: 3, inputs: 0 });
    });

    test('opens a tab on click and closes the previous one', async ({ page }) => {
      await goto(page);
      const accordion = single(page);

      await button(accordion, 0).click();
      await expect(button(accordion, 0)).toHaveAttribute('aria-expanded', 'true');

      await button(accordion, 1).click();
      await expect(button(accordion, 1)).toHaveAttribute('aria-expanded', 'true');
      await expect(button(accordion, 0)).toHaveAttribute('aria-expanded', 'false');
    });

    test('keeps several tabs open under multi', async ({ page }) => {
      await goto(page);
      const accordion = multi(page);
      await accordion.scrollIntoViewIfNeeded();

      await button(accordion, 0).click();
      await button(accordion, 2).click();
      await expect(button(accordion, 0)).toHaveAttribute('aria-expanded', 'true');
      await expect(button(accordion, 2)).toHaveAttribute('aria-expanded', 'true');
    });

    test('closing a tab collapses the accordion nested inside it', async ({ page }) => {
      await goto(page);
      const outer = nested(page);
      await outer.scrollIntoViewIfNeeded();

      await button(outer, 0).click();
      await expect(button(outer, 0)).toHaveAttribute('aria-expanded', 'true');

      // The inner accordion lives in the outer tab's body.
      const inner = page.locator('[data-demo="nested"] mp-accordion mp-accordion').first();
      await button(inner, 0).click();
      await expect(button(inner, 0)).toHaveAttribute('aria-expanded', 'true');

      await button(outer, 0).click();
      await expect(button(outer, 0)).toHaveAttribute('aria-expanded', 'false');
      await expect(button(inner, 0)).toHaveAttribute('aria-expanded', 'false');
    });

    test('exposes the APG structure and moves focus with the arrow keys', async ({ page }) => {
      await goto(page);
      const accordion = single(page);

      await expect(region(accordion, 0)).toHaveAttribute('role', 'region');
      await expect(button(accordion, 0)).toHaveAttribute('aria-controls', 'c0');

      await button(accordion, 0).focus();
      await page.keyboard.press('ArrowDown');
      await expect(button(accordion, 1)).toBeFocused();
      await page.keyboard.press('End');
      await expect(button(accordion, 2)).toBeFocused();
      await page.keyboard.press('Home');
      await expect(button(accordion, 0)).toBeFocused();
    });
  });
}

/**
 * No-JS suite (file-level `test.use({ javaScriptEnabled: false })` is applied
 * by the caller). Locator/native-state assertions only — with JS disabled
 * page.evaluate is unavailable.
 */
export function accordionNojsSuite(test: Test, expect: Expect, options: AccordionSuiteOptions = {}) {
  const path = options.path ?? PATH;

  test.describe('accordion (no JS, DSD)', () => {
    // The state machine is what's under test, not transition smoothness:
    // reduced motion collapses the CSS transitions (the component honours it),
    // which keeps Playwright's stability checks deterministic on cold servers.
    test.use({ reducedMotion: 'reduce' });

    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    });

    test('the DSD attaches server-side with the input machine in place', async ({ page }) => {
      const accordion = single(page);
      await expect(accordion.locator('.acc-input')).toHaveCount(3);
      await expect(accordion.locator('label.accordion-button')).toHaveCount(3);
      // Everything starts collapsed: the pre-rendered chrome carries no state.
      await expect(input(accordion, 0)).not.toBeChecked();
    });

    // At most ONE click per test from here on: Chromium with JS disabled
    // intermittently hangs the actionability stability wait when a test
    // switches click targets between elements (carousel suite lesson).
    // Everything after the first click is driven by focus + keyboard, which
    // skip that wait — and which is the no-JS keyboard story anyway.

    test('single-open: activating a header checks its radio and unchecks the previous', async ({ page }) => {
      const accordion = single(page);
      await button(accordion, 0).click();
      await expect(input(accordion, 0)).toBeChecked();

      await input(accordion, 1).focus();
      await page.keyboard.press('Space');
      await expect(input(accordion, 1)).toBeChecked();
      await expect(input(accordion, 0)).not.toBeChecked();
    });

    test('multi: the hidden checkboxes are keyboard-operable and stay open together', async ({ page }) => {
      const accordion = multi(page);
      await accordion.scrollIntoViewIfNeeded();

      await input(accordion, 0).focus();
      await page.keyboard.press('Space');
      // Tab reaches the next tab's input: the <label> header is not focusable,
      // and unlike a radio group a checkbox does not swallow the sequence.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');

      await expect(input(accordion, 0)).toBeChecked();
      await expect(input(accordion, 1)).toBeChecked();
    });

    test('two accordions on one page keep independent state (shadow-scoped groups)', async ({ page }) => {
      // Radio groups only form within one node tree, so each accordion's own
      // shadow root scopes its group — opening a tab in one must leave every
      // other accordion alone. A single action plus pure assertions, per the
      // Chromium/no-JS actionability lesson from the carousel suite.
      await button(single(page), 1).click();
      await expect(input(single(page), 1)).toBeChecked();
      await expect(input(multi(page), 0)).not.toBeChecked();
      await expect(input(multi(page), 1)).not.toBeChecked();
    });
  });
}
