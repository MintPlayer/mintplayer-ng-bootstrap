import { test, expect } from '@playwright/test';

// The whole point of the mp-shell migration: the sidebar + its hamburger toggle
// work with JavaScript fully disabled. The web component is never defined or
// upgraded — the server-rendered Declarative Shadow DOM attaches at parse time
// and a pure-CSS checkbox state machine (a <label> driving an in-shadow
// <input type=checkbox> via `:checked ~`) does the toggling. This spec runs the
// real Angular SSR server (the e2e `webServer`) with scripting off.
test.use({ javaScriptEnabled: false });

test('mp-shell sidebar toggles with JavaScript disabled (DSD + CSS only)', async ({ page }) => {
  // Below the `md` breakpoint the sidebar starts collapsed (an off-screen
  // overlay), so opening it is an unambiguous viewport change.
  await page.setViewportSize({ width: 500, height: 900 });
  await page.goto('/overlays/shell');
  await page.waitForLoadState('networkidle');

  const shell = page.locator('mp-shell').first();
  await expect(shell).toBeVisible();

  // The sidebar lives in the WC's shadow root. Playwright pierces open shadow
  // roots with CSS — finding it at all confirms the DSD attached with no JS.
  const sidebar = shell.locator('aside.sidebar');
  await expect(sidebar).toHaveCount(1);

  // Collapsed: the narrow-mode overlay sidebar is translated off-screen left.
  await expect(sidebar).not.toBeInViewport();

  // Click the built-in hamburger — a <label> for the in-shadow checkbox. This
  // is a native label/checkbox toggle; no script is involved.
  await shell.locator('label.shell-hamburger').click();

  // Opened: the full-width overlay slides into the viewport.
  await expect(sidebar).toBeInViewport();

  // Toggle back closed to prove it is a real two-way toggle, not a one-shot.
  await shell.locator('label.shell-hamburger').click();
  await expect(sidebar).not.toBeInViewport();
});
