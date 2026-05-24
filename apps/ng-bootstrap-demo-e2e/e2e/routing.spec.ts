import { test, expect } from '@playwright/test';

test('navigates to /basic/alert via the navbar dropdown', async ({ page }) => {
  await page.goto('/');
  // Wait for hydration: until Angular's `ngAfterContentChecked` runs on the
  // client, the dropdown trigger has no click listener (the SSR snapshot
  // doesn't carry one — see navbar-item.component.ts). `networkidle` is a
  // proxy for "the page has settled enough that lifecycle hooks have fired".
  // (The :focus-within CSS rule is gated on `.navbar.noscript`, so focus-only
  // tricks would only work in the SSR snapshot, not against the hydrated DOM.)
  await page.waitForLoadState('networkidle');

  const navbar = page.locator('bs-navbar');
  const basicTrigger = navbar.getByText('Basic', { exact: true });
  await basicTrigger.click();

  const alertItem = navbar.getByText('Alert', { exact: true });
  await expect(alertItem).toBeVisible();
  await alertItem.click();

  await expect(page).toHaveURL(/\/basic\/alert$/);
  await expect(page.getByRole('heading', { name: 'Alert', level: 1 })).toBeVisible();
});
