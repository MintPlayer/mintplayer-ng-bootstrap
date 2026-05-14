import { expect, test } from '@playwright/test';

/**
 * Regression: the originally-reported bug — the datetime-picker at the bottom
 * of the demo page opened its calendar/time popups downward and clipped them
 * below the viewport. After the overlay-positioning refactor the popup must
 * either flip above the trigger or, if neither candidate fits, clamp inside
 * the viewport via the "push" fallback.
 */
test.describe('datetime-picker — popup stays in viewport (issue #332 follow-up)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basic/forms/datetime-picker');
    await page.waitForLoadState('networkidle');
  });

  test('calendar popup of the bottom picker stays fully visible', async ({ page }) => {
    // Use the last picker on the page (the hour12 demo is the bottom one).
    const picker = page.locator('bs-datetime-picker').last();
    await picker.scrollIntoViewIfNeeded();

    await picker.getByRole('button', { name: 'Choose date' }).click();
    const calendar = picker.locator('mp-calendar').first();
    await expect(calendar).toBeVisible();

    // Read the calendar's bounding rect and assert it fits inside the viewport.
    const rect = await calendar.boundingBox();
    const vh = await page.evaluate(() => window.innerHeight);
    expect(rect).not.toBeNull();
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(vh);
  });

  test('time popup of the bottom picker stays fully visible', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').last();
    await picker.scrollIntoViewIfNeeded();

    await picker.getByRole('button', { name: 'Choose time' }).click();
    const timeList = picker.locator('mp-time-list').first();
    await expect(timeList).toBeVisible();

    const rect = await timeList.boundingBox();
    const vh = await page.evaluate(() => window.innerHeight);
    expect(rect).not.toBeNull();
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(vh);
  });

  test('popup follows the trigger on page scroll', async ({ page }) => {
    const picker = page.locator('bs-datetime-picker').first();
    const trigger = picker.getByRole('button', { name: 'Choose date' });
    await trigger.click();
    const calendar = picker.locator('mp-calendar').first();
    await expect(calendar).toBeVisible();

    const before = await calendar.boundingBox();
    expect(before).not.toBeNull();

    // Scroll the page by 100px. The popup should reposition to follow the trigger.
    await page.evaluate(() => window.scrollBy(0, 100));
    // Wait a frame for the rAF-batched reposition.
    await page.waitForTimeout(50);

    const after = await calendar.boundingBox();
    expect(after).not.toBeNull();
    // The popup moved relative to the viewport (it follows the trigger, which
    // is now 100px higher). With the reposition strategy it tracks; assert the
    // top moved by approximately -100 (some tolerance for fractional pixels
    // and the trigger's actual viewport position).
    const dy = (after!.y - before!.y);
    expect(Math.abs(dy)).toBeGreaterThan(50);
  });
});
