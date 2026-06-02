import { test, expect } from '@playwright/test';

// Regression guard: React hydration preserves the server-rendered Declarative
// Shadow DOM, so when <mp-shell> upgrades it must HYDRATE that shadow, not
// re-render into it. Without the lit-element-hydrate-support shim in
// entry-client, the upgrade appended a second copy of the chrome (a duplicated
// top bar / sidebar). This asserts the shadow stays single after hydration.
test('mp-shell hydrates the SSR shadow without duplicating its chrome', async ({ page }) => {
  await page.goto('/');
  // Wait for the client bundle to define + upgrade the web component.
  await page.waitForFunction(() => !!customElements.get('mp-shell'));

  const counts = await page.locator('mp-shell').first().evaluate((el: Element) => {
    const sr = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
    return {
      topbar: sr.querySelectorAll('.topbar').length,
      sidebarRoot: sr.querySelectorAll('.sidebar-root').length,
      hamburger: sr.querySelectorAll('.shell-hamburger').length,
    };
  });

  expect(counts).toEqual({ topbar: 1, sidebarRoot: 1, hamburger: 1 });
});
