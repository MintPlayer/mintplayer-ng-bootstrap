import { test, expect } from '@playwright/test';

test('navigates to /basic/alert via the navbar dropdown', async ({ page }) => {
  await page.goto('/');
  // Wait for hydration: the navbar is now the `<mp-navbar>` web component and
  // the dropdown trigger's click listener is only attached once the WC upgrades
  // on the client (registered via the wrapper's client-only import). Until then
  // the SSR/DSD snapshot has no click handler; the no-JS `:focus-within` reveal
  // is disengaged (`data-js`) as soon as the WC connects. `networkidle` is a
  // proxy for "the page has settled enough that the WCs have upgraded".
  await page.waitForLoadState('networkidle');

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
