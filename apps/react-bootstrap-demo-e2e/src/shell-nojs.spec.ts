import { test, expect } from '@playwright/test';

// The React demo's whole layout is <mp-shell> (AppShell.tsx). This proves the
// sidebar + hamburger toggle work with JavaScript fully disabled: the WC never
// upgrades — the server-rendered Declarative Shadow DOM attaches at parse time
// and a pure-CSS checkbox state machine does the toggling. Runs against the SSR
// server (see playwright.config webServer).
test.use({ javaScriptEnabled: false });

test('mp-shell sidebar toggles with JavaScript disabled (DSD + CSS only)', async ({ page }) => {
  // Below the `md` breakpoint the sidebar starts collapsed (off-screen overlay).
  await page.setViewportSize({ width: 500, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const shell = page.locator('mp-shell').first();
  await expect(shell).toBeVisible();

  // The sidebar lives in the WC's shadow root; finding it confirms the DSD
  // attached with no JS (Playwright pierces open shadow roots with CSS).
  const sidebar = shell.locator('aside.sidebar');
  await expect(sidebar).toHaveCount(1);

  // Collapsed → click the built-in hamburger (native <label> + checkbox) →
  // open → toggle back closed. No script involved at any step.
  await expect(sidebar).not.toBeInViewport();
  await shell.locator('label.shell-hamburger').click();
  await expect(sidebar).toBeInViewport();
  await shell.locator('label.shell-hamburger').click();
  await expect(sidebar).not.toBeInViewport();
});
