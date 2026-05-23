import { test, expect } from '@playwright/test';

test('navigates to /basic/alert via the navbar dropdown', async ({ page }) => {
  await page.goto('/');

  const navbar = page.locator('bs-navbar');
  await navbar.getByText('Basic', { exact: true }).click();

  // Explicitly wait for the dropdown menu to be open before clicking the
  // item. Without this the locator resolves to the Alert <a> while it's
  // still inside a hidden `.dropdown-menu` (the open transition hasn't
  // completed yet), and Playwright's .click() retry loop times out at 30 s
  // with "element is not visible" — see CI flake on PR #355.
  const alertItem = navbar.getByText('Alert', { exact: true });
  await expect(alertItem).toBeVisible();
  await alertItem.click();

  await expect(page).toHaveURL(/\/basic\/alert$/);
  await expect(page.getByRole('heading', { name: 'Alert', level: 1 })).toBeVisible();
});
