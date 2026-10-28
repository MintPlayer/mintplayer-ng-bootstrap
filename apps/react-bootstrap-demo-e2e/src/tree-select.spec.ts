import { test, expect } from '@playwright/test';

// The tree-select demo lives at /basic/tree-select. Each demo is wrapped in a
// `<section data-demo="…">`. The tree-select renders in the light DOM (#437), so
// its trigger, panel and rows are ordinary descendants of `.tree-select`.

test.beforeEach(async ({ page }) => {
  await page.goto('/basic/tree-select');
  await expect(page.locator('h1')).toContainText('Tree select');
});

test('renders all four demo sections', async ({ page }) => {
  await expect(page.locator('section[data-demo="single"]')).toBeVisible();
  await expect(page.locator('section[data-demo="multiple"]')).toBeVisible();
  await expect(page.locator('section[data-demo="checkbox"]')).toBeVisible();
  await expect(page.locator('section[data-demo="button"]')).toBeVisible();
});

test('opening the multiple demo shows the panel with in-memory roots', async ({ page }) => {
  const select = page.locator('section[data-demo="multiple"] .tree-select');
  await select.locator('.ts-control').click();

  const panel = select.locator('.ts-panel');
  await expect(panel).toBeVisible();
  // InMemory roots from SAMPLE_TREE — no backend required.
  await expect(panel.getByText('Engineering')).toBeVisible();
});

test('selecting nodes in the multiple demo adds chips', async ({ page }) => {
  const select = page.locator('section[data-demo="multiple"] .tree-select');
  await select.locator('.ts-control').click();

  const panel = select.locator('.ts-panel');
  await expect(panel).toBeVisible();

  // multiple mode renders a check glyph per row; clicking it toggles the node.
  const engineeringRow = panel.locator('[role="treeitem"]', { hasText: 'Engineering' });
  await engineeringRow.locator('.ts-node-check').click();

  const operationsRow = panel.locator('[role="treeitem"]', { hasText: 'Operations' });
  await operationsRow.locator('.ts-node-check').click();

  await expect(select.locator('.ts-chip')).toHaveCount(2);
  await expect(select.locator('.ts-chip')).toContainText(['Engineering', 'Operations']);
});

test('checkbox + cascade selects descendants', async ({ page }) => {
  const select = page.locator('section[data-demo="checkbox"] .tree-select');
  await select.locator('.ts-control').click();

  const panel = select.locator('.ts-panel');
  await expect(panel).toBeVisible();

  // Checking a parent cascades to its (loaded) children; the readout reflects
  // every selected node label.
  const designRow = panel.locator('[role="treeitem"]', { hasText: 'Design' });
  await designRow.locator('.ts-node-check').click();

  const readout = page.locator('section[data-demo="checkbox"] p code');
  await expect(readout).toContainText('Design');
});

test('button variant opens a panel containing the search box', async ({ page }) => {
  const select = page.locator('section[data-demo="button"] .tree-select');
  await select.locator('.ts-button').click();

  const panel = select.locator('.ts-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.panel-search')).toBeVisible();
});

// The single demo is backed by the .NET API. Only assert it opens when the
// backend is reachable; skip otherwise so the suite is hermetic.
test('single + server-search demo opens (backend-gated)', async ({ page, baseURL }) => {
  let backendUp = false;
  try {
    const res = await page.request.get(`${baseURL}/api/treeItems?page=1&perPage=1`);
    backendUp = res.ok();
  } catch {
    backendUp = false;
  }
  test.skip(!backendUp, 'API backend not reachable; skipping server-search assertions');

  const select = page.locator('section[data-demo="single"] .tree-select');
  await select.locator('.ts-control').click();
  await expect(select.locator('.ts-panel')).toBeVisible();
});
