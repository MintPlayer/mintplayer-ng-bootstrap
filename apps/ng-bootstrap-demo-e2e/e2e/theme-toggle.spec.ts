import { test, expect, type Page } from '@playwright/test';

// PRD dark-mode §5 (e2e): the navbar <bs-theme-toggle> cycles and persists the
// mode in the bs-theme-mode cookie, the SSR server renders <html data-bs-theme>
// from that cookie, the pre-boot script is served, and the server-rendered
// toggle keeps its box when it hydrates.

const COOKIE = 'bs-theme-mode';

// The button is disabled until the toggle hydrates, so waiting for it to be
// enabled is the readiness signal (never networkidle, never a swallowed wait).
const toggleButton = (page: Page) => page.locator('bs-theme-toggle button');

async function themeCookie(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === COOKIE)?.value;
}

test.describe('theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Pin the OS scheme so `auto` resolves the same on every machine. Each test
    // gets a fresh context, so no cookie carries over from another test.
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('cycles auto → light → dark → auto and writes the cookie', async ({ page }) => {
    await page.goto('/');
    const toggle = toggleButton(page);
    const html = page.locator('html');
    await expect(toggle).toBeEnabled();

    // No cookie: auto, resolved to light under the emulated scheme. The name is
    // the NEXT action, the description the CURRENT mode.
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(toggle).toHaveAccessibleName(/switch to light theme/i);
    await expect(toggle).toHaveAccessibleDescription(/auto theme/i);

    await toggle.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(toggle).toHaveAccessibleName(/switch to dark theme/i);
    await expect(toggle).toHaveAccessibleDescription(/light theme/i);
    await expect.poll(() => themeCookie(page)).toBe('light');

    await toggle.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'dark');
    await expect(toggle).toHaveAccessibleName(/switch to auto theme/i);
    await expect(toggle).toHaveAccessibleDescription(/dark theme/i);
    await expect.poll(() => themeCookie(page)).toBe('dark');

    await toggle.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(toggle).toHaveAccessibleName(/switch to light theme/i);
    await expect.poll(() => themeCookie(page)).toBe('auto');
  });

  test('the mode survives a reload', async ({ page }) => {
    await page.goto('/');
    await expect(toggleButton(page)).toBeEnabled();
    await toggleButton(page).click(); // auto → light
    await toggleButton(page).click(); // light → dark
    await expect.poll(() => themeCookie(page)).toBe('dark');

    await page.reload();
    await expect(toggleButton(page)).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
    await expect(toggleButton(page)).toHaveAccessibleName(/switch to auto theme/i);
  });

  test('the body background differs between light and dark', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: COOKIE, value: 'light', url: baseURL! }]);
    await page.goto('/');
    await expect(toggleButton(page)).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await toggleButton(page).click(); // light → dark
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    expect(lightBg).not.toBe(darkBg);
  });

  test('the server-rendered toggle already has its final box', async ({ browser, baseURL }) => {
    // With JS off the toggle is server-rendered, disabled, at the size the
    // scoped sheet gives it; hydration enables it and must not move it.
    const measure = async (javaScriptEnabled: boolean) => {
      const context = await browser.newContext({ baseURL, javaScriptEnabled });
      const page = await context.newPage();
      await page.goto('/');
      const root = page.locator('bs-theme-toggle').first();
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

test.describe('theme SSR (JavaScript disabled)', () => {
  // With scripting off neither the pre-boot script nor the store runs, so any
  // data-bs-theme on <html> was written by the server.
  test.use({ javaScriptEnabled: false });

  test('a dark cookie renders data-bs-theme="dark"', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: COOKIE, value: 'dark', url: baseURL! }]);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('an auto cookie renders no attribute', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: COOKIE, value: 'auto', url: baseURL! }]);
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-bs-theme');
  });

  test('an invalid cookie renders no attribute', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: COOKIE, value: encodeURIComponent('x"><script>'), url: baseURL! }]);
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-bs-theme');
  });
});

test.describe('theme server responses', () => {
  test('rendered HTML varies on Cookie', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    expect(response.headers()['vary'] ?? '').toMatch(/\bcookie\b/i);
  });

  test('the pre-boot script is served', async ({ request }) => {
    const response = await request.get('/theming/bs-theme-preboot.js');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type'] ?? '').toMatch(/javascript/);
    expect((await response.text()).length).toBeGreaterThan(0);
  });
});
