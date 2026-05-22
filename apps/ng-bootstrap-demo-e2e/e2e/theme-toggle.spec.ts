import { test, expect } from '@playwright/test';
test.describe('theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Force light mode irrespective of the host's prefers-color-scheme. This
    // makes the initial state deterministic across machines/CI.
    await page.emulateMedia({ colorScheme: 'light' });
    // Wipe persisted mode from a previous spec.
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('bs-theme-mode'));
  });

  test('pre-boot script applies persisted mode before paint', async ({ page }) => {
    // Seed the storage key before the page renders.
    await page.addInitScript(() => {
      localStorage.setItem('bs-theme-mode', 'dark');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const attr = await page.locator('html').getAttribute('data-bs-theme');
    expect(attr).toBe('dark');
  });

  test('toggle cycles auto → light → dark → auto', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('demo-theme-toggle button');
    const html = page.locator('html');

    // Initial: no storage → 'auto'. With emulated light scheme, effective = 'light'.
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-label', /light theme/i);

    // Click 1: auto → light.
    await toggle.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-label', /dark theme/i);
    expect(await page.evaluate(() => localStorage.getItem('bs-theme-mode'))).toBe('light');

    // Click 2: light → dark.
    await toggle.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-label', /auto theme/i);
    expect(await page.evaluate(() => localStorage.getItem('bs-theme-mode'))).toBe('dark');

    // Click 3: dark → auto (resolves back to light under emulated light scheme).
    await toggle.click();
    await expect(html).toHaveAttribute('data-bs-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-label', /light theme/i);
    expect(await page.evaluate(() => localStorage.getItem('bs-theme-mode'))).toBe('auto');
  });

  test('mode persists across reloads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('demo-theme-toggle button');
    // auto → light
    await toggle.click();
    expect(await page.evaluate(() => localStorage.getItem('bs-theme-mode'))).toBe('light');

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('bs-theme-mode'))).toBe('light');
  });

  test('body background-color differs between light and dark', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('demo-theme-toggle button');
    // Set to light explicitly.
    await page.evaluate(() => localStorage.setItem('bs-theme-mode', 'light'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Cycle to dark via the toggle (light → dark).
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    expect(lightBg).not.toBe(darkBg);
  });
});
