import { test, expect } from '@playwright/test';

test('home page renders the Vue demo brand', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Vue demo');
});

// CI's versioning plan stamps the library's package.json before the demo build; an unstamped
// build shows `dev`. The placeholder itself must never reach the page.
test('navbar shows the library version, or dev when unstamped', async ({ page }) => {
  await page.goto('/');
  const version = page.getByTitle('@mintplayer/vue-bootstrap on GitHub').locator('.github-link-version');
  await expect(version).toHaveText(/^(dev|\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?)$/);
});

test('framework switcher links to Angular and React with matching path', async ({ page }) => {
  await page.goto('/basic/forms/datepicker');

  const angularLink = page.getByRole('link', { name: 'Open the same page in the Angular demo' });
  const reactLink = page.getByRole('link', { name: 'Open the same page in the React demo' });

  // FrameworkLinks picks the origin from Vite's build-time `import.meta.env.DEV`:
  // localhost ports under the dev server, the prod subdomains in a built/SSR run
  // (the e2e serves the production build). Accept either — the assertion's point
  // is that the *path* is preserved across the target framework's origin.
  await expect(angularLink).toHaveAttribute('href', /^(http:\/\/localhost:4200|https:\/\/bootstrap\.mintplayer\.com)\/basic\/forms\/datepicker$/);
  await expect(reactLink).toHaveAttribute('href', /^(http:\/\/localhost:4000|https:\/\/react\.bootstrap\.mintplayer\.com)\/basic\/forms\/datepicker$/);
});
