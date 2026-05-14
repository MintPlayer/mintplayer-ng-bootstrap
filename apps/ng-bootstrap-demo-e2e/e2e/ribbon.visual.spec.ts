import { expect, Page, test } from '@playwright/test';

/**
 * Milestone 9 — visual-regression screenshots per version. Captures the
 * Insert tab at each office-2007 / -2010 / -2013 / -2016 theme so that any
 * subsequent CSS tweak that drifts the chrome shows up as a pixel diff.
 *
 * Run `npx playwright test ribbon.visual.spec.ts --update-snapshots` after
 * intentional theme changes to refresh baselines.
 *
 * Screenshots target only the `mp-ribbon` element so the demo's surrounding
 * controls panel doesn't pollute the diff. Each baseline is committed to
 * the repo under `__screenshots__/`.
 */
const VERSIONS = ['office-2007', 'office-2010', 'office-2013', 'office-2016'] as const;
type Version = (typeof VERSIONS)[number];

async function selectVersion(page: Page, version: Version): Promise<void> {
  const versionField = page.locator('.control-field', { hasText: 'Version' });
  await versionField.locator('select').selectOption(version);
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector('mp-ribbon')?.getAttribute('version'))
    )
    .toBe(version);
  // Let the host paint with the new tokens.
  await page.waitForTimeout(120);
}

async function selectTab(page: Page, label: string): Promise<void> {
  await page.evaluate((wanted) => {
    const ribbon = document.querySelector('mp-ribbon');
    if (!ribbon?.shadowRoot) throw new Error('mp-ribbon not mounted');
    const tab = Array.from(
      ribbon.shadowRoot.querySelectorAll<HTMLElement>('[role="tab"]')
    ).find((b) => (b.textContent ?? '').trim() === wanted);
    if (!tab) throw new Error(`tab "${wanted}" not found`);
    tab.click();
  }, label);
}

test.describe('ribbon — visual regression per version', () => {
  // Visual diffs only run on Chromium-Win32 to keep the snapshot count
  // small. Cross-engine font rasterisation differences would produce noise
  // without adding signal; cross-OS rasterisation differences would do the
  // same. The baselines committed under `__snapshots__/` are
  // `*-chromium-win32.png` — Playwright names the file by platform, so on
  // Linux it would look for `*-chromium-linux.png` and either auto-create
  // a baseline (locally, with --update-snapshots) or fail (in CI).
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium-only baselines');
  test.skip(
    process.platform !== 'win32',
    'Visual baselines were captured on Win32; cross-platform rasterisation diffs would be noisy. Skipped on other OSes and in Linux CI.'
  );

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 200 });
    await page.goto('/enterprise/ribbon');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(
      () => !!document.querySelector('mp-ribbon')?.shadowRoot?.querySelector('[role="tab"]')
    );
    await selectTab(page, 'Insert');
  });

  for (const version of VERSIONS) {
    test(`Insert tab visual baseline — ${version}`, async ({ page }) => {
      await selectVersion(page, version);
      await expect(page.locator('mp-ribbon')).toHaveScreenshot(`insert-${version}.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
