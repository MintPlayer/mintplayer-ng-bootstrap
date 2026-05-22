import { test, expect } from '@playwright/test';

test('modal opens and closes via the close button', async ({ page }) => {
  await page.goto('/overlays/modals');
  // The demo uses SSR without provideClientHydration(), so Angular performs a
  // destructive client bootstrap. Without this wait, click handlers may not
  // yet be bound (consistently reproducible in Firefox).
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Show modal' }).click();
  const title = page.getByText('Modal title', { exact: true });
  await expect(title).toBeVisible();

  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(title).not.toBeVisible();
});
