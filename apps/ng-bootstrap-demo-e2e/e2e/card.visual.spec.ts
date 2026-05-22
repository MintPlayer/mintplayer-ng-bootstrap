import { expect, test } from '@playwright/test';
/**
 * Visual regression — pins the full Bootstrap card surface (every region,
 * every colour variant, outline, image positions, group, header tabs/pills)
 * against a committed baseline so subsequent class-application changes
 * surface as a pixel diff.
 *
 * Refresh baselines with `npx playwright test card.visual.spec.ts
 * --update-snapshots` after intentional changes.
 *
 * Baselines are captured on Chromium-Win32 only — cross-engine and
 * cross-OS font rasterisation differences would produce noise without
 * adding signal, same policy as ribbon.visual.spec.ts.
 */
test.describe('card — visual regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium-only baselines');
  test.skip(
    process.platform !== 'win32',
    'Visual baselines were captured on Win32; cross-platform rasterisation diffs would be noisy.'
  );

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/basic/containers/card');
    // Per project_e2e_destructive_bootstrap: SSR bootstrap is destructive,
    // so waiting on `networkidle` after goto is the supported way to settle
    // before asserting on the DOM.
    await page.waitForLoadState('networkidle');
    // The demo loads placeholder images from placehold.co; wait for the
    // first one to paint so the snapshot doesn't catch the loading state.
    await page.waitForFunction(
      () => Array.from(document.images).every((img) => img.complete)
    );
  });

  test('demo page renders the full card surface', async ({ page }) => {
    await expect(page.locator('demo-card')).toHaveScreenshot('card-demo.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
