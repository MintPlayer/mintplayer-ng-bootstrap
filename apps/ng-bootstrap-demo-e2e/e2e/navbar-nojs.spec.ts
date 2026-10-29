import { test, expect } from '@playwright/test';

// The no-JS guarantee for the navbar (#437): Angular SSR renders the whole
// bar as plain HTML (no shadow DOM, no upgrade). The collapse is a CSS state
// machine (a <label for> flips an <input type=checkbox>, and
// `.navbar-toggle:checked ~ .navbar-collapse` reveals it), and every dropdown
// is a native <details>. This spec runs the real Angular SSR server (the e2e
// `webServer`) with scripting off, so the navbar has to work from the HTML alone.
test.use({ javaScriptEnabled: false });

// Below the app shell's breakpoint the bar is in its collapsed small mode, so
// the hamburger + checkbox state machine is what's under test.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });
});

test('the navbar is server-rendered HTML (no shadow root, no upgrade)', async ({ page }) => {
  const navbar = page.locator('bs-navbar').first();
  await expect(navbar).toBeVisible();
  await expect(navbar).toHaveAttribute('role', 'navigation');
  await expect(navbar.locator('.navbar-collapse')).toHaveCount(1);
  await expect(navbar.locator('label.navbar-toggler')).toBeVisible();
  // Script-only ARIA state is absent rather than frozen at a lie.
  await expect(navbar.locator('input.navbar-toggle')).not.toHaveAttribute('aria-expanded', /.*/);
  // The nav content is server-rendered too, so links exist and are navigable
  // (behind the closed collapse at this width: hidden until the hamburger opens it).
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0);
  await navbar.locator('label.navbar-toggler').click();
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
});

test('nested dropdowns are submenus server-side (no-JS styling parity)', async ({ page }) => {
  // The submenu shape (dropdown-item trigger, inline-end caret, 0.5rem inset)
  // hangs off `.dropdown-submenu`, which the core writes from the depth: the
  // server output must already carry it, on exactly the nested dropdowns.
  const nested = page.locator('bs-navbar details.dropdown details.dropdown');
  const marked = page.locator('bs-navbar details.dropdown-submenu');
  expect(await nested.count()).toBeGreaterThan(0);
  expect(await marked.count()).toBe(await nested.count());
  expect(await page.locator('bs-navbar details.dropdown').count()).toBeGreaterThan(await marked.count());
});

test('the hamburger toggles the collapse via the native checkbox (CSS only)', async ({ page }) => {
  const navbar = page.locator('bs-navbar').first();
  // The checkbox's checked state is a NATIVE toggle (no script), so it is
  // observable with JS disabled — unlike the grid reveal, which is a paint-clip
  // (`overflow:hidden` + row `0fr→1fr`) that leaves bounding boxes unchanged.
  // Asserting the checkbox is the honest proxy for the CSS reveal it drives.
  const toggle = navbar.locator('input.navbar-toggle');
  const toggler = navbar.locator('label.navbar-toggler');

  await expect(toggle).not.toBeChecked(); // collapsed
  await toggler.click();
  await expect(toggle).toBeChecked(); // <label for> flipped it → menu slides open
  await toggler.click();
  await expect(toggle).not.toBeChecked(); // real two-way toggle, not one-shot
});

test('a dropdown opens natively with no script', async ({ page }) => {
  const navbar = page.locator('bs-navbar').first();
  await navbar.locator('label.navbar-toggler').click();
  const basic = navbar.locator('details.dropdown', { has: page.locator(':scope > summary', { hasText: 'Basic' }) }).first();
  await expect(basic).not.toHaveAttribute('open', /.*/);
  // Focus + Enter, not a second click: Chromium with JS off intermittently hangs
  // the actionability stability wait when a test switches click targets
  // (accordion and carousel suites). Enter on a summary is the native toggle too.
  await basic.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(basic).toHaveAttribute('open', '');
  await expect(basic.getByRole('link', { name: 'Alert', exact: true })).toBeVisible();
});
