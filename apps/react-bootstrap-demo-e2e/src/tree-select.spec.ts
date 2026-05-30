import { test, expect } from '@playwright/test';

// The tree-select demo lives at /basic/tree-select. Each demo is wrapped in a
// `<section data-demo="…">`. The WC renders its trigger / panel / rows inside a
// shadow root; Playwright's CSS engine pierces shadow boundaries automatically.

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
  const select = page.locator('section[data-demo="multiple"] mp-tree-select');
  await select.locator('.ts-control').click();

  const panel = select.locator('.ts-panel');
  await expect(panel).toBeVisible();
  // InMemory roots from SAMPLE_TREE — no backend required.
  await expect(panel.getByText('Engineering')).toBeVisible();
});

test('selecting nodes in the multiple demo adds chips', async ({ page }) => {
  const select = page.locator('section[data-demo="multiple"] mp-tree-select');
  await select.locator('.ts-control').click();

  const panel = select.locator('.ts-panel');
  await expect(panel).toBeVisible();

  // multiple mode renders a checkbox per row; toggling it selects the node.
  const engineeringRow = panel.locator('.ts-node', { hasText: 'Engineering' });
  await engineeringRow.locator('.ts-node-check').check();

  const operationsRow = panel.locator('.ts-node', { hasText: 'Operations' });
  await operationsRow.locator('.ts-node-check').check();

  await expect(select.locator('.ts-chip')).toHaveCount(2);
  await expect(select.locator('.ts-chip')).toContainText(['Engineering', 'Operations']);
});

test('checkbox + cascade selects descendants', async ({ page }) => {
  const select = page.locator('section[data-demo="checkbox"] mp-tree-select');
  await select.locator('.ts-control').click();

  const panel = select.locator('.ts-panel');
  await expect(panel).toBeVisible();

  // Checking a parent cascades to its (loaded) children; the readout reflects
  // every selected node label.
  const designRow = panel.locator('.ts-node', { hasText: 'Design' });
  await designRow.locator('.ts-node-check').check();

  const readout = page.locator('section[data-demo="checkbox"] p code');
  await expect(readout).toContainText('Design');
});

test('button variant opens a panel containing the search box', async ({ page }) => {
  const select = page.locator('section[data-demo="button"] mp-tree-select');
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

  const select = page.locator('section[data-demo="single"] mp-tree-select');
  await select.locator('.ts-control').click();
  await expect(select.locator('.ts-panel')).toBeVisible();
});
