import { test, expect } from '@playwright/test';

// A native radio set, not a roving tabindex (#437): the browser keeps one tab
// stop and moves-and-selects on the arrow keys.
test('radio-group: arrows move and select within the native set', async ({ page }) => {
  await page.goto('/basic/radio');
  const items = page.locator('input[type=radio][name="color"]');
  await expect(items.first()).toBeVisible();
  await items.first().check();
  await items.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(items.nth(1)).toBeFocused();
  await expect(items.nth(1)).toBeChecked();
  await expect(items.first()).not.toBeChecked();
});
