import { test, expect } from '@playwright/test';

test('datepicker selects a date in the next month and updates the display', async ({ page }) => {
  await page.goto('/basic/datepicker');
  await page.waitForLoadState('networkidle');

  // Sanity: the demo's "selected date" line is on screen.
  const dateDisplay = page.getByText(/The selected date is:/);
  await expect(dateDisplay).toBeVisible();
  const initial = (await dateDisplay.textContent())?.trim();

  // The toggle is a <button> with bsDropdownToggle attribute, label = current date.
  await page.locator('button[bsDropdownToggle]').click();

  const calendar = page.locator('bs-calendar');
  await expect(calendar).toBeVisible();

  // Navigate to next month so the chosen day is guaranteed to differ from today.
  // Calendar's first row has [prev | month/year | next] — last button is "next".
  await calendar.locator('table tr').first().locator('button').last().click();

  // Click day "1" — odd, so not disabled by the demo's even-day disable rule;
  // present in every month. Click on the <td> (the click handler is there, not on <span>).
  await calendar
    .locator('td')
    .filter({ hasText: /^1$/ })
    .first()
    .click();

  await expect(dateDisplay).not.toHaveText(initial ?? '');
});
