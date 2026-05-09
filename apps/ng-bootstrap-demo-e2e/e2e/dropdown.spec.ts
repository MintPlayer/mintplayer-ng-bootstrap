import { test, expect } from '@playwright/test';

test('dropdown opens with calendar inside and closes on outside click', async ({ page }) => {
  await page.goto('/overlays/dropdown');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Dropdown' }).click();
  const calendar = page.locator('bs-calendar');
  await expect(calendar).toBeVisible();

  // Click the page h1 — outside the dropdown — to trigger closeOnClickOutside.
  await page.getByRole('heading', { name: 'Dropdown', level: 1 }).click();
  await expect(calendar).not.toBeVisible();
});
