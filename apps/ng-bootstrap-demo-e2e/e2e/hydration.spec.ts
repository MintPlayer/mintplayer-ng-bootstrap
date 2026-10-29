import { test, expect } from '@playwright/test';

// Pages whose fronts render a consumer's projected nodes OUTSIDE their own host
// (an accordion tab's body inside the accordion's <details>, a tab page's body
// inside the tab control's panel). Angular gives such nodes a body-relative
// hydration path, which platform-server's event-replay <script> — inserted
// after the paths are computed — shifts by one node. useScopedStyles repairs
// the body before any front hydrates; without it each of these pages throws
// "Cannot read properties of null (reading 'nextSibling')" and stays inert.
const PAGES = [
  '/enterprise/accordion',
  '/basic/containers/tab-control',
  '/overlays/shell',
  '/advanced/sticky-footer',
  '/basic/placeholder',
  // A <form> nested in bs-form's own form: the parser drops it, so hydration
  // walked one level off and threw "hasAttribute is not a function".
  '/additional-samples/stepper',
];

for (const path of PAGES) {
  test(`${path} hydrates without an error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(path);
    // Every Angular front constructs from its parent's template, so a navbar
    // that answers means the page has hydrated past it; the error, if any, is
    // logged synchronously during that pass.
    await page.locator('bs-navbar[data-mp-hydrated]').first().waitFor({ state: 'attached' });
    expect(errors.filter((text) => !/ResizeObserver loop/.test(text))).toEqual([]);
    // The replay script was dropped, and the contract that ran it was not.
    await expect(page.locator('#ng-event-dispatch-contract')).toHaveCount(1);
  });
}
