import { test, expect } from '@playwright/test';

// The no-JS guarantee for the WC navbar: the bar, its hamburger toggle and the
// collapsible region are server-rendered as Declarative Shadow DOM and the
// collapse is driven by a pure-CSS state machine — a <label for> flips an
// in-shadow <input type=checkbox>, and `.navbar-toggle:checked ~ .navbar-collapse`
// (see navbar.styles.scss) reveals it. `mp-navbar` is never defined or upgraded.
// This spec runs the real Angular SSR server (the e2e `webServer`) with scripting
// off, so the navbar has to work from the parse-time DSD alone.
test.use({ javaScriptEnabled: false });

// Below `lg` (the app shell's breakpoint) the bar is in its collapsed small mode,
// so the hamburger + checkbox state machine is what's under test.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });
});

test('the navbar DSD attaches server-side (no JS, no upgrade)', async ({ page }) => {
  const navbar = page.locator('mp-navbar').first();
  await expect(navbar).toBeVisible();

  // Playwright pierces open shadow roots with CSS — finding the shadow chrome at
  // all confirms the DSD attached at parse time, with no client upgrade. (With
  // JS disabled `page.evaluate`/computed-style reads are unavailable, so every
  // assertion here is locator/native-state based.)
  await expect(navbar.locator('.navbar-collapse')).toHaveCount(1);
  await expect(navbar.locator('label.navbar-toggler')).toBeVisible();

  // The slotted nav content is server-rendered too (light DOM projected into the
  // collapse), so links exist and are navigable with no JS.
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(1);
});

test('nested dropdowns are marked data-submenu server-side (no-JS styling parity)', async ({ page }) => {
  // `data-submenu` gates every submenu-specific shadow style (the
  // dropdown-item trigger padding, right caret, 0.5rem panel inset) but is
  // normally set by connectedCallback — JS. The SSR injector must mark
  // structurally-nested dropdowns itself, or a no-JS submenu trigger falls
  // back to first-level nav-link padding and renders flush-left (the
  // "Forms glued to the left" regression).
  const nested = page.locator('mp-dropdown-menu mp-navbar-dropdown');
  const marked = page.locator('mp-navbar-dropdown[data-submenu]');
  expect(await nested.count()).toBeGreaterThan(0);
  expect(await marked.count()).toBe(await nested.count()); // every nested one is marked…
  expect(await page.locator('mp-dropdown-menu mp-navbar-dropdown:not([data-submenu])').count()).toBe(0);
  // …and only nested ones (first-level dropdowns exist and stay unmarked).
  expect(await page.locator('mp-navbar-dropdown').count()).toBeGreaterThan(await marked.count());
});

test('the hamburger toggles the collapse via the native checkbox (CSS only)', async ({ page }) => {
  const navbar = page.locator('mp-navbar').first();
  // The in-shadow checkbox is the no-JS state holder; `:checked ~ .navbar-collapse`
  // slides the menu open. Its checked state is a NATIVE toggle (no script), so it
  // is observable with JS disabled — unlike the grid reveal, which is a paint-clip
  // (`overflow:hidden` + row `0fr→1fr`) that leaves bounding boxes unchanged and so
  // can't be measured geometrically. Asserting the checkbox is the honest proxy for
  // the CSS reveal it drives.
  const toggle = navbar.locator('input.navbar-toggle');
  const toggler = navbar.locator('label.navbar-toggler');

  await expect(toggle).not.toBeChecked(); // collapsed
  await toggler.click();
  await expect(toggle).toBeChecked(); // <label for> flipped it → menu slides open
  await toggler.click();
  await expect(toggle).not.toBeChecked(); // real two-way toggle, not one-shot
});
