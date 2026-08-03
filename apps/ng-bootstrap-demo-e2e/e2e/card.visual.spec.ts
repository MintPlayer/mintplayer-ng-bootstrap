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
 * Chromium only, but BOTH platforms: `-chromium-win32.png` and
 * `-chromium-linux.png` are separate committed baselines, so a developer on
 * Windows and Linux CI each compare against their own rasteriser and never
 * across one. See `../VISUAL-BASELINES.md`, and the same note on
 * ribbon.visual.spec.ts.
 */
test.describe('card — visual regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium-only baselines');

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/basic/containers/card');
    // Per project_e2e_destructive_bootstrap: SSR bootstrap is destructive,
    // so waiting on `networkidle` after goto is the supported way to settle
    // before asserting on the DOM.
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });
    // The placeholders are inline SVG data URLs (see `makePlaceholder` in
    // card.component.ts), deliberately, so there is no external service to be
    // slow or absent — which is what makes this shot safe to assert in CI at
    // all. Still wait for decode, so the snapshot cannot catch a pre-paint
    // frame.
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
