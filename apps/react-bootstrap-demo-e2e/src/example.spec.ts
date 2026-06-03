import { test, expect } from '@playwright/test';

test('home page renders the React demo brand', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('React demo');
});

test('framework switcher links to Angular and Vue with matching path', async ({ page }) => {
  await page.goto('/basic/forms/datepicker');

  const angularLink = page.getByRole('link', { name: 'Open the same page in the Angular demo' });
  const vueLink = page.getByRole('link', { name: 'Open the same page in the Vue demo' });

  // FrameworkLinks picks the origin from Vite's build-time `import.meta.env.DEV`:
  // localhost ports under the dev server, the prod subdomains in a built/SSR run
  // (the e2e serves the production `server.mjs`). Accept either — the assertion's
  // point is that the *path* is preserved across the target framework's origin.
  await expect(angularLink).toHaveAttribute('href', /^(http:\/\/localhost:4200|https:\/\/bootstrap\.mintplayer\.com)\/basic\/forms\/datepicker$/);
  await expect(vueLink).toHaveAttribute('href', /^(http:\/\/localhost:4100|https:\/\/vue\.bootstrap\.mintplayer\.com)\/basic\/forms\/datepicker$/);
});
