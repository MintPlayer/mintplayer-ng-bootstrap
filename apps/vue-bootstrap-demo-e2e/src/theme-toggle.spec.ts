import { test, expect, type Page } from '@playwright/test';

// Dark mode in the Vue demo (PRD dark-mode D5, D5b, D8, FR-6, FR-7, FR-9).
// The toggle is <BsThemeToggle> in the App.vue top bar; the SSR splice lives
// in server.mjs. Runs against the SSR server (see playwright.config webServer).

const COOKIE = 'bs-theme-mode';
const TOGGLE = '[slot="topbar"] mp-theme-toggle';

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
    // The shadow-root button carries the role; its name is the NEXT action.
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

  test('upgrading the toggle causes no layout shift', async ({ page }) => {
    // Hold every script except the blocking pre-boot one, so the page parses,
    // styles and lays out with <mp-theme-toggle> still undefined.
    let release!: () => void;
    const scriptsReleased = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/*', async (route) => {
      const request = route.request();
      if (request.resourceType() === 'script' && !request.url().includes('bs-theme-preboot')) {
        await scriptsReleased;
      }
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'commit' });
    const toggle = page.locator(TOGGLE);
    // color-mode.css reserves the box through mp-theme-toggle:not(:defined).
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        return !!el && !customElements.get('mp-theme-toggle') && getComputedStyle(el).display === 'inline-block';
      },
      TOGGLE,
    );
    const before = await toggle.boundingBox();

    release();
    await page.waitForFunction(() => !!customElements.get('mp-theme-toggle'));
    await expect(toggle.locator('button')).toBeVisible();
    await settle(page);
    const after = await toggle.boundingBox();

    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(0.5);
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
