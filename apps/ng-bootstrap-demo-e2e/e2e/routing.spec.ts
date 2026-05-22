import { test, expect } from '@playwright/test';
test('navigates to /basic/alert via the navbar dropdown', async ({ page }) => {
  await page.goto('/');

  const navbar = page.locator('bs-navbar');
  await navbar.getByText('Basic', { exact: true }).click();
  await navbar.getByText('Alert', { exact: true }).click();

  await expect(page).toHaveURL(/\/basic\/alert$/);
  await expect(page.getByRole('heading', { name: 'Alert', level: 1 })).toBeVisible();
});
