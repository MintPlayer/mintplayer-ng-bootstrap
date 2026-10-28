import { test, expect, type Page } from '@playwright/test';

// Dark mode in the React demo (PRD dark-mode D5, D5b, D8, FR-6, FR-7, FR-9).
// The toggle is <BsThemeToggle> in the AppShell top bar; the SSR splice lives
// in server.mjs. Runs against the SSR server (see playwright.config webServer).

const COOKIE = 'bs-theme-mode';
const TOGGLE = '.app-shell-header .theme-toggle';

const settle = (page: Page) =>
  page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });

const themeCookie = async (page: Page) =>
  (await page.context().cookies()).find((c) => c.name === COOKIE)?.value;

test.describe('theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Deterministic starting point regardless of the host OS scheme.
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('clicking cycles auto -> light -> dark -> auto and sets the cookie', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    const html = page.locator('html');
    // The button carries the role; its name is the NEXT action.
    const button = page.locator(TOGGLE).locator('button');

    // No cookie: auto, resolved against the emulated light scheme.
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(button).toHaveAttribute('aria-label', 'Switch to light theme');

    await button.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(button).toHaveAttribute('aria-label', 'Switch to dark theme');
    await expect.poll(() => themeCookie(page)).toBe('light');

    await button.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'dark');
    await expect(button).toHaveAttribute('aria-label', 'Switch to auto theme');
    await expect.poll(() => themeCookie(page)).toBe('dark');

    await button.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(button).toHaveAttribute('aria-label', 'Switch to light theme');
    await expect.poll(() => themeCookie(page)).toBe('auto');
  });

  test('the chosen mode survives a reload', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    const button = page.locator(TOGGLE).locator('button');
    await button.click(); // auto -> light
    await button.click(); // light -> dark
    await expect.poll(() => themeCookie(page)).toBe('dark');

    await page.reload();
    await settle(page);
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
    await expect(button).toHaveAttribute('aria-label', 'Switch to auto theme');
  });

  test('the pre-boot script is served and revalidated', async ({ page }) => {
    const res = await page.request.get('/theming/bs-theme-preboot.js');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/javascript/);
    // Stable URL, so it must not ride the one-year static max-age.
    expect(res.headers()['cache-control']).toContain('no-cache');
    expect(await res.text()).toContain('data-bs-theme');
  });

  test('the server-rendered toggle already has its final box', async ({ browser, baseURL }) => {
    // With JS off the toggle is server-rendered, disabled, at the size the
    // scoped sheet gives it; hydration enables it and must not move it.
    const measure = async (javaScriptEnabled: boolean) => {
      const context = await browser.newContext({ baseURL, javaScriptEnabled });
      const page = await context.newPage();
      await page.goto('/');
      const root = page.locator('.app-shell-header .theme-toggle').first();
      const button = root.locator('button');
      if (javaScriptEnabled) await expect(button).toBeEnabled();
      else await expect(button).toBeDisabled();
      const box = await root.boundingBox();
      await context.close();
      return box && { width: box.width, height: box.height };
    };
    const before = await measure(false);
    const after = await measure(true);
    expect(before).not.toBeNull();
    expect(before!.width).toBeGreaterThan(0);
    expect(after).toEqual(before);
  });
});

test.describe('theme SSR splice (JavaScript disabled)', () => {
  // With no script at all, only the server can have written the attribute.
  test.use({ javaScriptEnabled: false });

  test('a dark cookie renders <html data-bs-theme="dark">, with Vary: Cookie', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: COOKIE, value: 'dark', url: baseURL! }]);
    const res = await page.goto('/');
    expect(res?.headers()['vary']).toMatch(/cookie/i);
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
    // The splice merges into <html>; lang survives.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('a custom mode passes through', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: COOKIE, value: 'sepia', url: baseURL! }]);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'sepia');
  });

  test('no cookie, an auto cookie or an invalid cookie renders no attribute', async ({ page, baseURL }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-bs-theme', /.*/);

    await page.context().addCookies([{ name: COOKIE, value: 'auto', url: baseURL! }]);
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-bs-theme', /.*/);

    await page.context().addCookies([{ name: COOKIE, value: encodeURIComponent('x"><script>'), url: baseURL! }]);
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-bs-theme', /.*/);
  });
});
