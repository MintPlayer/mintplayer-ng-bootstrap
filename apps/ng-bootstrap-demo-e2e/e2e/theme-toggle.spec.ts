import { test, expect, type Page } from '@playwright/test';

// PRD dark-mode §5 (e2e): the navbar <bs-theme-toggle> cycles and persists the
// mode in the bs-theme-mode cookie, the SSR server renders <html data-bs-theme>
// from that cookie, the pre-boot script is served, and the toggle's upgrade
// causes no layout shift.

const COOKIE = 'bs-theme-mode';

// The button lives in <mp-theme-toggle>'s open shadow root; Playwright's CSS
// engine pierces it. It exists only once the element has upgraded, so waiting
// for it is the readiness signal (never networkidle, never a swallowed wait).
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
    await expect(toggle).toBeVisible();

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
    await expect(toggleButton(page)).toBeVisible();
    await toggleButton(page).click(); // auto → light
    await toggleButton(page).click(); // light → dark
    await expect.poll(() => themeCookie(page)).toBe('dark');

    await page.reload();
    await expect(toggleButton(page)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
    await expect(toggleButton(page)).toHaveAccessibleName(/switch to auto theme/i);
  });

  test('the body background differs between light and dark', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: COOKIE, value: 'light', url: baseURL! }]);
    await page.goto('/');
    await expect(toggleButton(page)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await toggleButton(page).click(); // light → dark
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    expect(lightBg).not.toBe(darkBg);
  });

  test('upgrading the toggle causes no layout shift', async ({ page }) => {
    // Hold back the mp-theme-toggle definition, so the element can be measured
    // in its pre-upgrade state (the box color-mode.css reserves), then release it.
    await page.addInitScript(() => {
      const registry = window.customElements;
      const define = registry.define.bind(registry);
      const w = window as unknown as { __releaseThemeToggle?: () => void };
      registry.define = (name, ctor, options) => {
        if (name === 'mp-theme-toggle') {
          w.__releaseThemeToggle = () => define(name, ctor, options);
          return;
        }
        define(name, ctor, options);
      };
    });
    await page.goto('/');
    await expect
      .poll(() => page.evaluate(() => typeof (window as unknown as { __releaseThemeToggle?: unknown }).__releaseThemeToggle))
      .toBe('function');

    const element = page.locator('bs-theme-toggle mp-theme-toggle');
    expect(await element.evaluate((el) => el.matches(':defined'))).toBe(false);
    const before = await element.boundingBox();

    await page.evaluate(async () => {
      (window as unknown as { __releaseThemeToggle: () => void }).__releaseThemeToggle();
      await customElements.whenDefined('mp-theme-toggle');
    });
    await expect(toggleButton(page)).toBeVisible();
    const after = await element.boundingBox();

    expect(before).not.toBeNull();
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
