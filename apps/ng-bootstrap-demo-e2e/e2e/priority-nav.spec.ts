import { test, expect } from '@playwright/test';

/**
 * The overflow menu closes after an item action (#426), in a real browser:
 * keyboard activation and the focus return can only be trusted here.
 */
test.describe('priority-nav overflow actions', () => {
  test.beforeEach(async ({ page }) => {
    // Below sm, so collapseAt='sm' puts every action into More.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/advanced/priority-nav');
  });

  test('activating an action by keyboard runs it, closes More and returns focus to it', async ({ page }) => {
    const demo = page.locator('.actions-demo');
    const more = demo.locator('button.priority-nav-more-toggle');
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');

    const edit = demo.locator('.priority-nav-overflow').getByRole('button', { name: 'Edit' });
    await edit.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Last action: Edit')).toBeVisible();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more).toBeFocused();
  });
});
