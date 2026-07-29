import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * THROWAWAY — spike 0.1b (a11y plan Phase 0). Pixel-diffs the shipping
 * bs-accordion against the <details name> variant D1 will ship, per pair on
 * /spike/accordion-parity. Runs via playwright.spike.config.ts (adds WebKit).
 * Deleted before merge together with the spike route; the verdict and any
 * accepted deltas go into the plan's Phase 0 RESULT block.
 */

const PAIRS = ['default-open', 'collapsed', 'highlight-open'] as const;

const SCENARIOS = [
  { name: 'light-desktop', theme: 'light', width: 1100 },
  { name: 'dark-desktop', theme: 'dark', width: 1100 },
  { name: 'light-narrow', theme: 'light', width: 480 },
] as const;

for (const scenario of SCENARIOS) {
  test.describe(scenario.name, () => {
    test.use({ viewport: { width: scenario.width, height: 1400 } });

    for (const pair of PAIRS) {
      test(pair, async ({ page }) => {
        await page.goto('/spike/accordion-parity');
        await page.waitForLoadState('networkidle');
        await page.evaluate((theme) => document.documentElement.setAttribute('data-bs-theme', theme), scenario.theme);
        await page.waitForTimeout(500);

        const bs = PNG.sync.read(await page.locator(`[data-pair="${pair}"] [data-side="bs"]`).screenshot());
        const details = PNG.sync.read(await page.locator(`[data-pair="${pair}"] [data-side="details"]`).screenshot());

        expect(details.width, 'sides must have identical width').toBe(bs.width);
        expect(details.height, `heights differ: bs=${bs.height} details=${details.height}`).toBe(bs.height);

        const diffPixels = pixelmatch(bs.data, details.data, null, bs.width, bs.height, { threshold: 0.15 });
        const ratio = diffPixels / (bs.width * bs.height);
        expect(ratio, `${diffPixels} differing pixels (${(ratio * 100).toFixed(2)}%)`).toBeLessThan(0.005);
      });
    }
  });
}

test.describe('summary UX affordances (visual question 5)', () => {
  test('summary has pointer cursor and no text selection on double click', async ({ page }) => {
    await page.goto('/spike/accordion-parity');
    await page.waitForLoadState('networkidle');
    const summary = page.locator('[data-pair="collapsed"] summary').first();
    const style = await summary.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { cursor: cs.cursor, userSelect: cs.userSelect || (cs as unknown as { webkitUserSelect: string }).webkitUserSelect };
    });
    expect(style.cursor).toBe('pointer');
    expect(style.userSelect).toBe('none');

    await summary.dblclick();
    const selected = await page.evaluate(() => String(window.getSelection() ?? ''));
    expect(selected).toBe('');
  });
});
