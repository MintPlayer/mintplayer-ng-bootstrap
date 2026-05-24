import { test, expect } from '@playwright/test';

test('datepicker selects a date and updates the display', async ({ page }) => {
  await page.goto('/basic/forms/datepicker');
  await page.waitForLoadState('networkidle');

  // Sanity: the demo's "selected date" line is on screen.
  const dateDisplay = page.getByText(/The selected date is:/);
  await expect(dateDisplay).toBeVisible();
  const initial = (await dateDisplay.textContent())?.trim();
  expect(initial).toBeTruthy();

  // Click the calendar trigger inside mp-datepicker (shadow DOM is pierced).
  await page.getByRole('button', { name: 'Choose date' }).click();

  // The mp-calendar grid is visible inside the popup.
  const calendar = page.locator('mp-calendar');
  await expect(calendar).toBeVisible();

  // Navigate to next month so the chosen day is guaranteed to differ from today.
  await calendar.getByRole('button', { name: 'Next month' }).click();

  // Click day 7 — odd, so the demo's even-day disable rule lets it through.
  // Cell ids look like `mp-cal-N-cell-YYYY-M-7`.
  await calendar.locator('td[id$="-7"]').first().click();

  await expect(dateDisplay).not.toHaveText(initial!);
});
