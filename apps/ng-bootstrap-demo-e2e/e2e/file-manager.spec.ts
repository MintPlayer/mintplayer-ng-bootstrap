import { test, expect } from '@playwright/test';

// Smoke-test the file-manager demo. The Lit web component renders into a
// shadow DOM, but Playwright's selectors pierce open shadow roots — so we
// can locate the breadcrumb, tree, and datatable via accessible names.
test('file manager renders tree, datatable and breadcrumb on the enterprise route', async ({ page }) => {
  await page.goto('/enterprise/file-manager');
  await page.waitForLoadState('networkidle');

  // Page heading
  await expect(page.getByRole('heading', { name: 'File manager' })).toBeVisible();

  // Toolbar buttons are present
  await expect(page.getByRole('button', { name: 'New folder' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rename' }).first()).toBeVisible();

  // Breadcrumb starts at Home (current page)
  const home = page.getByRole('button', { name: 'Home', exact: true });
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute('aria-current', 'page');

  // Tree contains top-level folders from the mock data
  await expect(page.getByRole('treeitem', { name: 'Documents' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: 'Pictures' })).toBeVisible();

  // File-list shows the same folders at root level
  await expect(page.getByRole('row', { name: /Documents/ })).toBeVisible();
});

test('navigating into a folder updates the breadcrumb', async ({ page }) => {
  await page.goto('/enterprise/file-manager');
  await page.waitForLoadState('networkidle');

  // Double-click the Documents folder row to navigate in
  await page.getByRole('row', { name: /Documents/ }).first().dblclick();

  // Breadcrumb now shows "Documents" as the current segment
  await expect(page.getByRole('button', { name: 'Documents' }).last()).toHaveAttribute('aria-current', 'page');

  // The new file list should show the child folders
  await expect(page.getByRole('row', { name: /Reports/ })).toBeVisible();
});

test('view mode toggle switches to icons grid', async ({ page }) => {
  await page.goto('/enterprise/file-manager');
  await page.waitForLoadState('networkidle');

  // Switch to icons via the toolbar toggle.
  await page.getByRole('button', { name: 'Icons view' }).click();

  // The icon-grid container should now render gridcells in place of rows.
  await expect(page.locator('mp-file-manager').locator('.icon-card').first()).toBeVisible();
});
