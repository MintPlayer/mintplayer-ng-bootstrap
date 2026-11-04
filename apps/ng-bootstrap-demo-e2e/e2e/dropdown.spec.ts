import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/overlays/dropdown');
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });
});

test('a menu opens from the keyboard, chooses an item and returns focus to the trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Actions' });
  await expect(trigger).toHaveAttribute('id', /-trigger$/);
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  const menu = page.getByRole('menu', { name: 'Actions' });
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('menuitem', { name: 'New' })).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Open…' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId('chosen')).toHaveText('Chosen: open');
});

test('Escape and an outside click close it', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Actions' });
  await expect(trigger).toHaveAttribute('id', /-trigger$/);
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Actions' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(menu).toBeVisible();
  await page.getByRole('heading', { name: 'Dropdown', level: 1 }).click();
  await expect(menu).toHaveCount(0);
});

test('a dialog dropdown holds any content', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Pick a date' });
  await expect(trigger).toHaveAttribute('id', /-trigger$/);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Pick a date' });
  await expect(dialog.locator('bs-calendar')).toBeVisible();
  await expect(dialog).toBeFocused();
});
