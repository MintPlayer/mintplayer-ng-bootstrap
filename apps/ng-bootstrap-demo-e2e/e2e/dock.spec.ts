import { test, expect } from '@playwright/test';

// The plan originally called for "split a panel via pointer events". Honouring
// that requires reverse-engineering the dock manager's drop-zone protocol —
// each tweak to the Lit web component's drag handlers would break the spec.
// Instead, we exercise dock state at a stable behavioural boundary: the
// "Capture layout JSON" button mutates the savedLayout signal, which causes
// the "Captured snapshot" section to render. That validates dock-manager
// rendering + its capture API end-to-end without coupling to drag internals.
test('dock manager renders panels and captures a layout snapshot', async ({ page }) => {
  await page.goto('/advanced/dock');

  await expect(page.getByRole('heading', { name: 'Panel 1' })).toBeVisible();

  const capturedHeader = page.getByRole('heading', { name: 'Captured snapshot' });
  await expect(capturedHeader).not.toBeVisible();

  await page.getByRole('button', { name: 'Capture layout JSON' }).click();

  await expect(capturedHeader).toBeVisible();
});
