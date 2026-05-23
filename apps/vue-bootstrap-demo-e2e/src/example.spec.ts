import { test, expect } from '@playwright/test';

test('home page renders the Vue demo brand', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Vue demo');
});

test('framework switcher links to Angular and React with matching path', async ({ page }) => {
  await page.goto('/basic/datepicker');

  const angularLink = page.getByRole('link', { name: 'Open the same page in the Angular demo' });
  const reactLink = page.getByRole('link', { name: 'Open the same page in the React demo' });

  // Localhost dev hosts per FrameworkLinks: Angular=4200, React=4000.
  await expect(angularLink).toHaveAttribute('href', 'http://localhost:4200/basic/datepicker');
  await expect(reactLink).toHaveAttribute('href', 'http://localhost:4000/basic/datepicker');
});
