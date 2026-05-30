import { test, expect } from '@playwright/test';

// The mp-tree-select demos render entirely inside shadow DOM; Playwright's CSS
// engine pierces shadow boundaries automatically. We assert against the
// in-memory demos only so the spec never depends on the .NET backend.

test('tree-select page renders its heading and four demo sections', async ({ page }) => {
  await page.goto('/basic/tree-select');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText('Tree select');
  await expect(page.locator('section h2')).toHaveCount(4);
});

test('multiple demo opens a panel and selecting a node adds a chip', async ({ page }) => {
  await page.goto('/basic/tree-select');
  await page.waitForLoadState('networkidle');

  // Second section is the in-memory "Multiple — chips" demo.
  const demo = page.locator('section').nth(1).locator('mp-tree-select');

  // Open the dropdown by clicking the textbox trigger.
  await demo.locator('.ts-control').click();

  // Panel appears with the in-memory roots loaded.
  const panel = demo.locator('.ts-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Engineering')).toBeVisible();

  // Tick the checkbox on the first root row → one chip in the trigger.
  await panel.locator('.ts-node-check').first().check();
  await expect(demo.locator('.ts-chip')).toHaveCount(1);
  await expect(demo.locator('.ts-chip-label')).toContainText('Engineering');
});

test('checkbox + cascade demo selects descendants when a parent is checked', async ({ page }) => {
  await page.goto('/basic/tree-select');
  await page.waitForLoadState('networkidle');

  // Third section is the "Checkbox — cascade" demo.
  const demo = page.locator('section').nth(2).locator('mp-tree-select');

  await demo.locator('.ts-control').click();
  const panel = demo.locator('.ts-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Engineering')).toBeVisible();

  // Expand the first root so its children load (they're lazy), then check the
  // parent. Cascade selects the parent + its loaded descendants, which surface
  // as chips on the trigger (checkbox mode renders chips too).
  await panel.locator('.treeview-chevron').first().click();
  await expect(panel.getByText('Frontend')).toBeVisible();

  await panel.locator('.ts-node-check').first().check();

  // Parent + descendants → more than one chip (proves the cascade).
  await expect.poll(async () => demo.locator('.ts-chip').count()).toBeGreaterThan(1);
});
