import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

/**
 * Milestone 8 — axe-core ARIA audit on the ribbon demo. Asserts zero
 * serious / critical findings on the default view, on Simplified layout,
 * and with the Picture Tools contextual set visible. Anything new the
 * ribbon introduces will trip this gate before it ships.
 *
 * The ribbon renders in the light DOM (#437), so every tab's `aria-controls`
 * resolves to its panel in the same tree and `aria-valid-attr-value` runs.
 *
 * Rules disabled (with reason):
 *   - `region`: the demo page wraps the ribbon in a non-landmark <div>;
 *     irrelevant to the ribbon component itself.
 *   - `color-contrast`: dev-server CSS reload occasionally flags
 *     dark-on-app-accent flashes that resolve once the version + accent
 *     pickers settle. Asserted separately via screenshot diffs (FR-22 path).
 */
async function blockingFindings(page: Page) {
  const results = await new AxeBuilder({ page }).include('.ribbon').include('.qat').disableRules(['region', 'color-contrast']).analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

test.describe('ribbon — axe-core a11y audit', () => {
  // axe's tree walk + rule eval is slow on Firefox under the dev server.
  test.slow();

  test.beforeEach(async ({ page }) => {
    await page.goto('/enterprise/ribbon');
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });
    await expect(page.locator('.ribbon [role="tab"]').first()).toBeVisible();
  });

  test('default view has zero serious or critical findings', async ({ page }) => {
    const blocking = await blockingFindings(page);
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('Simplified layout has zero serious or critical findings', async ({ page }) => {
    await page.getByRole('button', { name: /Switch to Simplified Layout/i }).click();
    await expect(page.locator('.ribbon').first()).toHaveAttribute('data-layout', 'simplified');

    const blocking = await blockingFindings(page);
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('Picture Tools contextual visible has zero serious or critical findings', async ({ page }) => {
    await page.getByRole('button', { name: /Select picture/i }).click();
    await expect(page.locator('.ribbon .ribbon-contextual-group-band')).toBeVisible();

    const blocking = await blockingFindings(page);
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
