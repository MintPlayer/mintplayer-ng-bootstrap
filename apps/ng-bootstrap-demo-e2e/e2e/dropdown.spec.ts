import { test, expect } from '@playwright/test';
test('dropdown opens with calendar inside and closes on outside click', async ({ page }) => {
  await page.goto('/overlays/dropdown');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Dropdown' }).click();
  const calendar = page.locator('bs-calendar');
  await expect(calendar).toBeVisible();

  // bs-dropdown-menu suppresses outside-click handling for 100 ms after open
  // to avoid the toggle's own click being read as an outside click. Wait past
  // that window before clicking outside, otherwise the close never fires.
  await page.waitForTimeout(150);

  // Click the page h1 — outside the dropdown — to trigger closeOnClickOutside.
  await page.getByRole('heading', { name: 'Dropdown', level: 1 }).click();
  await expect(calendar).not.toBeVisible();
});
