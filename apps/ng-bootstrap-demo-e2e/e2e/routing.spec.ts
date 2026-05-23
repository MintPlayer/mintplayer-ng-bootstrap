import { test, expect } from '@playwright/test';

test('navigates to /basic/alert via the navbar dropdown', async ({ page }) => {
  await page.goto('/');

  const navbar = page.locator('bs-navbar');

  // The dropdown is opened by a JS click handler that's attached lazily in
  // navbar-item.component.ts:ngAfterContentChecked(). On a cold CI runner the
  // first .click() can race that hook — the click fires before the listener
  // is attached, so the dropdown never opens, and the next .click() on Alert
  // times out at "element is not visible". The `close-init-b` attribute is
  // set ONLY after the listener is attached, so wait for it before clicking.
  // (The :focus-within CSS rule is gated on `.navbar.noscript`, so focus-only
  // tricks don't help when JS is enabled.)
  const basicTrigger = navbar.getByText('Basic', { exact: true });
  await expect(basicTrigger).toHaveAttribute('close-init-b', '1');
  await basicTrigger.click();

  const alertItem = navbar.getByText('Alert', { exact: true });
  await expect(alertItem).toBeVisible();
  await alertItem.click();

  await expect(page).toHaveURL(/\/basic\/alert$/);
  await expect(page.getByRole('heading', { name: 'Alert', level: 1 })).toBeVisible();
});
