import type { ConsoleMessage, Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

/**
 * The framework hydration warnings (PRD #437 §9.4): Angular NG0500-NG0507 (and
 * NG0750, an incremental-hydration mismatch), React "did not match" /
 * "Hydration failed", Vue "Hydration ... mismatch". Any of them means the
 * server and the client rendered different DOM, which the headless
 * architecture exists to rule out.
 */
const HYDRATION_WARNING = /NG050\d|NG0750|hydration (?:failed|mismatch|node mismatch|text mismatch|attribute mismatch)|did not match/i;

/**
 * Starts collecting hydration warnings on `page`. Call before `goto`; read the
 * returned getter after the page has hydrated.
 */
export function listenForHydrationWarnings(page: Page): () => string[] {
  const warnings: string[] = [];
  const onConsole = (message: ConsoleMessage): void => {
    if ((message.type() === 'warning' || message.type() === 'error') && HYDRATION_WARNING.test(message.text())) {
      warnings.push(message.text());
    }
  };
  page.on('console', onConsole);
  return () => warnings;
}

export interface SsrRoute {
  path: string;
  /**
   * Selectors that must match at least one node IN THE SERVER HTML: the
   * component's role-bearing parts, e.g. `[role=combobox]`. An empty custom
   * element shell does not satisfy this; that is the point (§9.2).
   */
  expect: string[];
  /** Readiness after a JS-enabled `goto`, before hydration warnings are read. */
  ready?: (page: Page) => Promise<void>;
}

/**
 * §9.2 + §9.4 per demo route:
 *
 * 1. The SSR payload, with its scripts stripped so nothing can render on the
 *    client, contains every `expect` selector.
 * 2. The same route with JS on hydrates without a single hydration warning.
 */
export function ssrSuite(test: Test, expect: Expect, routes: SsrRoute[]): void {
  test.describe('SSR renders real HTML and hydrates cleanly', () => {
    const suites = routes.map((route) => {
      test(`${route.path}: server HTML is not empty`, async ({ page }) => {
        await page.route('**/*', async (handler) => {
          if (handler.request().resourceType() !== 'document') {
            await handler.continue();
            return;
          }
          const response = await handler.fetch();
          const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
          await handler.fulfill({ response, body: html });
        });
        await page.goto(route.path, { waitUntil: 'load' });
        const counts = await Promise.all(route.expect.map((selector) => page.locator(selector).count()));
        expect(Object.fromEntries(route.expect.map((selector, i) => [selector, counts[i] > 0]))).toEqual(
          Object.fromEntries(route.expect.map((selector) => [selector, true])),
        );
      });

      test(`${route.path}: hydrates without warnings`, async ({ page }) => {
        const warnings = listenForHydrationWarnings(page);
        await page.goto(route.path, { waitUntil: 'load' });
        await route.ready?.(page);
        expect(warnings()).toEqual([]);
      });
      return route.path;
    });
    void suites;
  });
}
