import { test, expect } from '@playwright/test';

test.describe('bs-datetime-picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basic/datetime-picker');
    await page.waitForLoadState('networkidle');
  });

  test('opens calendar popup from the 📅 trigger and selects a date', async ({ page }) => {
    // "Minimal" example is the first bs-datetime-picker on the page.
    const picker = page.locator('bs-datetime-picker').first();
    const dateTrigger = picker.getByRole('button', { name: 'Choose date' });
    await dateTrigger.click();

    // mp-calendar is rendered inside the date popup.
    const calendar = picker.locator('mp-calendar');
    await expect(calendar).toBeVisible();

    // Click a day in the visible month (15 is always present).
    await calendar.locator('td[id$="-15"]').first().click();

    // Selecting a date does NOT close the date popup (per Phase 6 value-flow).
    // But the displayed value updates.
    const input = picker.locator('input.form-control');
    await expect(input).not.toHaveValue('');
  });

  test('opens time popup from the 🕐 trigger and selects a slot', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    await picker.getByRole('button', { name: 'Choose time' }).click();
    const timeList = picker.locator('mp-time-list');
    await expect(timeList).toBeVisible();

    // Pick 09:00 (any locale formatting that includes "9").
    const slot = timeList.getByRole('option').filter({ hasText: '9' }).first();
    await slot.click();

    // Time selection closes the popup; display value updates.
    await expect(picker.locator('input.form-control')).not.toHaveValue('');
  });

  test('mutual exclusion — opening time closes date', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    await picker.getByRole('button', { name: 'Choose date' }).click();
    await expect(picker.locator('mp-calendar')).toBeVisible();
    await picker.getByRole('button', { name: 'Choose time' }).click();
    await expect(picker.locator('mp-time-list')).toBeVisible();
    // The date popup's content is no longer shown.
    await expect(picker.locator('mp-calendar')).toBeHidden();
  });

  test('Esc closes the open popup', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    await picker.getByRole('button', { name: 'Choose date' }).click();
    await expect(picker.locator('mp-calendar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(picker.locator('mp-calendar')).toBeHidden();
  });

  test('clear button removes the value', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    // First, select something so the clear button appears.
    await picker.getByRole('button', { name: 'Choose time' }).click();
    const slot = picker.locator('mp-time-list').getByRole('option').first();
    await slot.click();
    const input = picker.locator('input.form-control');
    await expect(input).not.toHaveValue('');

    // Now the clear button is visible (showClear=true in the demo).
    await picker.getByRole('button', { name: 'Clear' }).click();
    await expect(input).toHaveValue('');
  });

  test('reactive-form section shows valid + dirty after selection', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Reactive form' });
    const section = heading.locator('xpath=..');
    const picker = section.locator('bs-datetime-picker');

    // Open time and pick a slot to trigger valueChanges + markAsDirty.
    await picker.getByRole('button', { name: 'Choose time' }).click();
    await picker.locator('mp-time-list').getByRole('option').first().click();

    await expect(section.getByText(/FormControl\.dirty/)).toContainText('true');
  });

  test('Tab moves focus from input → date trigger → time trigger', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    // Focus into the input first.
    await picker.locator('input.form-control').focus();
    await page.keyboard.press('Tab');
    await expect(picker.getByRole('button', { name: 'Choose date' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(picker.getByRole('button', { name: 'Choose time' })).toBeFocused();
  });

  test('ArrowDown on the date trigger opens the date popup', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    await picker.getByRole('button', { name: 'Choose date' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(picker.locator('mp-calendar')).toBeVisible();
  });
});
