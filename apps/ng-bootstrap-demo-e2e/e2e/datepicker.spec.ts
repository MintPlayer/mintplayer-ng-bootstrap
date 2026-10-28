import { test, expect } from '@playwright/test';

test('datepicker selects a date and updates the display', async ({ page }) => {
  await page.goto('/basic/forms/datepicker');
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });

  // Sanity: the demo's "selected date" line is on screen.
  const dateDisplay = page.getByText(/The selected date is:/);
  await expect(dateDisplay).toBeVisible();
  const initial = (await dateDisplay.textContent())?.trim();
  expect(initial).toBeTruthy();

  const picker = page.locator('bs-datepicker').first();
  const trigger = picker.getByRole('button', { name: 'Choose date' });
  await trigger.click();

  // The grid opens in a native popover and takes focus (APG date picker dialog).
  const dialog = page.getByRole('dialog', { name: 'Choose date' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[role=gridcell]:focus')).toHaveCount(1);

  // Navigate to next month so the chosen day is guaranteed to differ from today.
  await dialog.getByRole('button', { name: 'Next month' }).click();

  // Day 7 is odd, so the demo's even-day disable rule lets it through.
  await dialog.locator('td[data-date$="-07"]:not(.calendar-day-outside)').click();

  await expect(dateDisplay).not.toHaveText(initial!);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(picker.locator('input.datepicker-input')).not.toHaveValue('');
});

test('datepicker closes on Escape and keeps the date', async ({ page }) => {
  await page.goto('/basic/forms/datepicker');
  const picker = page.locator('bs-datepicker').first();
  const field = picker.locator('input.datepicker-input');
  const before = await field.inputValue();
  await picker.getByRole('button', { name: 'Choose date' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose date' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(field).toHaveValue(before);
});
