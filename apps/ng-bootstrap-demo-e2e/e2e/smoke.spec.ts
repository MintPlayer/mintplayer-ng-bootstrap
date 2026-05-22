import { test, expect } from '@playwright/test';
test('home loads with navbar brand and main sections', async ({ page }) => {
  await page.goto('/');

  const navbar = page.locator('bs-navbar');
  await expect(navbar.getByText('ng-bootstrap', { exact: true })).toBeVisible();

  const items = ['Home', 'Basic', 'Overlays', 'Advanced', 'Animations', 'Additional samples'];
  await Promise.all(
    items.map(item => expect(navbar.getByText(item, { exact: true })).toBeVisible()),
  );
});
