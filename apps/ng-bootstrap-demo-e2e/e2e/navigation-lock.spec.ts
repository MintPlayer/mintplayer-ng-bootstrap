import { test, expect, type Dialog } from '@playwright/test';

// Regression coverage for the navigation-lock guard. The demo at
// `/advanced/navigation-lock` registers a `[bsNavigationLock]` with a
// `canExit` that returns `window.confirm(...)` unless `allowExit === true`.
// The library's `bsNavigationLockGuard` runs as `canMatch` on the root route
// — so EVERY router navigation should consult registered locks and EVERY
// lock with `allowExit === false` should trigger a `confirm()` prompt.
//
// We caught a regression where the guard wasn't being invoked at all on
// inter-navbar clicks; the test below would have caught it.

test.describe('navigation-lock', () => {
  // Regression coverage: the guard MUST consult locks on every navigation
  // (including the second-and-later navigations after the app has booted).
  // The bug we're guarding against: a `pending`-Promise cache in
  // `BsNavigationLockService.requestExit` got poisoned by the very first
  // canMatch fire — which runs before any directive has registered, so locks
  // is empty and `doRequestExit` resolves synchronously. From that point on,
  // every subsequent navigation hit the cache and returned `true` without
  // consulting registered locks. End result: navigation-lock silently broken.
  // Surface signal: `window.confirm` never fires when the user clicks another
  // navbar item with the form locked. So the test condition is
  // "confirm fires at least once" — anything else is a separate concern.
  test('dismissing confirm() keeps the user on the locked page', async ({ page }) => {
    const messages: string[] = [];
    const handler = (dialog: Dialog) => {
      messages.push(dialog.message());
      void dialog.dismiss(); // simulate user clicking "Cancel"
    };
    page.on('dialog', handler);

    await page.goto('/advanced/navigation-lock');
    await page.waitForLoadState('networkidle');

    // Default state is allowExit=false; canExit will call confirm() on every
    // navigation attempt regardless of form contents.
    await page
      .locator('bs-navbar a')
      .filter({ hasText: /^Home$/ })
      .first()
      .click();

    // Give the router + dialog round-trip time to settle.
    await page.waitForTimeout(500);

    // 1. The confirm() prompt must have fired. (Was broken pre-fix: every
    //    navigation after the first short-circuited via a poisoned pending
    //    cache in `BsNavigationLockService.requestExit`.)
    expect(messages.length).toBeGreaterThan(0);

    // 2. Dismissing the prompt must keep the user on the locked page —
    //    this is the user-visible promise of the navigation-lock feature.
    //    If the URL has moved on, the cancellation pipeline is broken.
    await expect(page).toHaveURL(/\/advanced\/navigation-lock$/);

    page.off('dialog', handler);
  });

  test('accept lets the user navigate away', async ({ page }) => {
    const handler = (dialog: Dialog) => {
      void dialog.accept();
    };
    page.on('dialog', handler);

    await page.goto('/advanced/navigation-lock');
    await page.waitForLoadState('networkidle');

    await page
      .locator('bs-navbar a')
      .filter({ hasText: /^Home$/ })
      .first()
      .click();

    await expect(page).toHaveURL(/^\/?$|\/$/);

    page.off('dialog', handler);
  });

  test('Allow exit checked → no prompt, navigation proceeds', async ({ page }) => {
    let dialogCount = 0;
    const handler = (dialog: Dialog) => {
      dialogCount++;
      void dialog.dismiss();
    };
    page.on('dialog', handler);

    await page.goto('/advanced/navigation-lock');
    await page.waitForLoadState('networkidle');

    // Toggle the demo's "Allow exit" checkbox. We can't reach in through
    // `ng.getComponent` here — Playwright runs against a production build of
    // the demo (see playwright.config.ts: `--configuration=production`), and
    // Angular's prod mode strips the global `ng` debug API, so the previous
    // `ng.getComponent(root).allowExit = true` short-circuited to a no-op and
    // the form stayed locked. Drive the bs-checkbox via its rendered input.
    await page.getByRole('checkbox', { name: 'Allow exit' }).check();

    await page
      .locator('bs-navbar a')
      .filter({ hasText: /^Home$/ })
      .first()
      .click();

    expect(dialogCount).toBe(0);
    await expect(page).toHaveURL(/^\/?$|\/$/);

    page.off('dialog', handler);
  });
});
