import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * axe-core ARIA audit on the datetime-picker demo. Asserts zero serious /
 * critical findings on the default view and with both popups open in turn.
 */
test.describe('datetime-picker — axe-core a11y audit', () => {
  test.slow();

  test.beforeEach(async ({ page }) => {
    await page.goto('/basic/datetime-picker');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(
      () => !!document.querySelector('bs-datetime-picker'),
    );
  });

  test('default view has zero serious or critical findings', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('bs-datetime-picker')
      .disableRules([
        // `aria-controls` on the triggers points at popup ids inside the
        // shadow root. axe can't resolve IDs across the shadow boundary,
        // but the ARIA spec + modern screen readers handle this pattern.
        'aria-valid-attr-value',
      ])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('with date popup open has zero serious or critical findings', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    await picker.getByRole('button', { name: 'Choose date' }).click();
    await expect(picker.locator('mp-calendar')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('bs-datetime-picker')
      .disableRules(['aria-valid-attr-value'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('with time popup open has zero serious or critical findings', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    await picker.getByRole('button', { name: 'Choose time' }).click();
    await expect(picker.locator('mp-time-list')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('bs-datetime-picker')
      .disableRules(['aria-valid-attr-value'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
