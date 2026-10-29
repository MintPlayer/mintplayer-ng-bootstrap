import { test, expect } from '@playwright/test';

test('navigates to /basic/alert via the navbar dropdown', async ({ page }) => {
  await page.goto('/');
  // Wait for hydration: the dropdown's click handling attaches once the navbar
  // core is live on the client. `networkidle` is a proxy for "the page has
  // settled enough that hydration finished".
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });

  // `bs-navbar` is still the Angular host selector (it wraps `<mp-navbar>`), and
  // the nav items / dropdown labels stay in its light DOM, so these locators
  // resolve. "Basic" is now a `<span slot="label">` inside `bs-navbar-dropdown`;
  // clicking it hits the shadow `.dropdown-toggle` anchor it is slotted into.
  const navbar = page.locator('bs-navbar');
  const basicTrigger = navbar.getByText('Basic', { exact: true });
  await basicTrigger.click();

  const alertItem = navbar.getByText('Alert', { exact: true });
  await expect(alertItem).toBeVisible();
  await alertItem.click();

  await expect(page).toHaveURL(/\/basic\/alert$/);
  await expect(page.getByRole('heading', { name: 'Alert', level: 1 })).toBeVisible();
});
