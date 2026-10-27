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

// CI's versioning plan stamps the library's package.json before the demo build; an unstamped
// build shows `dev`. The placeholder itself must never reach the page.
test('navbar shows the library version, or dev when unstamped', async ({ page }) => {
  await page.goto('/');
  const version = page.getByTitle('@mintplayer/ng-bootstrap on GitHub').locator('span');
  await expect(version).toHaveText(/^(dev|\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?)$/);
});
