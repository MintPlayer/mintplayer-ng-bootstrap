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

    // `enterFromTop` animates the popup from `top: -50%` to `top: 0` over 500ms.
    // Waiting for the entrance to settle ensures `before` is the popup's resting
    // position, not a mid-flight value — otherwise the post-scroll delta is
    // polluted by the tail of the entrance animation and reads as 17–48px in
    // Firefox instead of ~100px.
    await page.waitForTimeout(600);
    const before = await calendar.boundingBox();
    expect(before).not.toBeNull();

    // Scroll the page by 100px. The popup should reposition to follow the trigger.
    await page.evaluate(() => window.scrollBy(0, 100));

    // Poll the popup's box until the reposition lands. Firefox's rAF batching is
    // slower than Chromium's; a fixed `waitForTimeout(50)` here was flaky.
    await expect
      .poll(async () => {
        const r = await calendar.boundingBox();
        return r ? Math.abs(r.y - before!.y) : 0;
      }, { timeout: 2000 })
      .toBeGreaterThan(50);
  });
});
