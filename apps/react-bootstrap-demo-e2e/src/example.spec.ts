import { test, expect } from '@playwright/test';

test('home page renders the React demo brand', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('React demo');
});

test('framework switcher links to Angular and Vue with matching path', async ({ page }) => {
  await page.goto('/basic/forms/datepicker');

  const angularLink = page.getByRole('link', { name: 'Open the same page in the Angular demo' });
  const vueLink = page.getByRole('link', { name: 'Open the same page in the Vue demo' });

  // Localhost dev hosts per FrameworkLinks: Angular=4200, Vue=4100.
  await expect(angularLink).toHaveAttribute('href', 'http://localhost:4200/basic/forms/datepicker');
  await expect(vueLink).toHaveAttribute('href', 'http://localhost:4100/basic/forms/datepicker');
});
