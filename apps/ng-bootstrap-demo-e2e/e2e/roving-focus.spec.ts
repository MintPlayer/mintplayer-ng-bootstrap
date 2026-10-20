import { test, expect } from '@playwright/test';
import { rovingFocusSuite } from '../../../tools/e2e-shared/roving-focus-suites';

rovingFocusSuite(test, expect, {
  name: 'tab-control',
  path: '/basic/containers/tab-control',
  container: (page) => page.locator('.tab-control[data-mps="tab-control"]').first(),
  items: (page) => page.locator('.tab-control[data-mps="tab-control"]').first().locator('[role="tab"]'),
  forwardKey: 'ArrowRight',
});

// A native radio set, not a roving tabindex (#437): the browser keeps one tab
// stop and moves-and-selects on the arrow keys.
test('radio-group: arrows move and select within the native set', async ({ page }) => {
  await page.goto('/basic/forms/radio');
  const items = page.locator('input[type=radio][name="fruitTemplate"]');
  await expect(items.first()).toBeVisible();
  await items.first().check();
  await items.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(items.nth(1)).toBeFocused();
  await expect(items.nth(1)).toBeChecked();
  await expect(items.first()).not.toBeChecked();
});
