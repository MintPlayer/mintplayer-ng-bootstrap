import { test, expect, type Page } from '@playwright/test';

// E2E coverage for the tree-select demo page (/basic/tree-select).
//
// The page renders tree-selects in order:
//   [0] single   — HTTP provider (needs the backend; not asserted here)
//   [1] multiple — InMemoryTreeSelectProvider (no backend)
//   [2] checkbox — InMemoryTreeSelectProvider (no backend)
//   [3] button   — InMemoryTreeSelectProvider (no backend)
//
// We assert against the in-memory demos only, so the spec is independent of the
// .NET backend. The component is a generated Angular front (#437): its markup is
// light DOM, the root bag on the `bs-tree-select.tree-select` host, and the panel is a native popover.

const select = (page: Page, index: number) => page.locator('bs-tree-select.tree-select').nth(index);

async function openTreeSelect(page: Page, index: number) {
  const ts = select(page, index);
  await ts.locator('.ts-control').click();
  await expect(ts.locator('.ts-panel')).toBeVisible();
  await expect(ts.locator('input.ts-search')).toHaveAttribute('aria-expanded', 'true');
}

const row = (page: Page, index: number, label: string) =>
  select(page, index).locator('[role="treeitem"]', { hasText: label }).first();

// In multiple/checkbox modes the check glyph toggles a node; a folder's row only expands.
const toggle = (page: Page, index: number, label: string) => row(page, index, label).locator('.ts-node-check').click();

const chipLabels = (page: Page, index: number) => select(page, index).locator('.ts-chip .ts-chip-label');

test.describe('tree-select demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basic/tree-select');
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });
    await expect(page.locator('bs-tree-select.tree-select')).toHaveCount(6);
  });

  test('opening the multiple dropdown reveals the panel with root options', async ({ page }) => {
    await openTreeSelect(page, 1);
    await expect(row(page, 1, 'Fruit')).toBeVisible();
    await expect(row(page, 1, 'Vegetables')).toBeVisible();
  });

  test('selecting nodes in the multiple demo adds chips', async ({ page }) => {
    await openTreeSelect(page, 1);
    await toggle(page, 1, 'Fruit');
    await expect(chipLabels(page, 1)).toHaveText(['Fruit']);
    await toggle(page, 1, 'Vegetables');
    await expect(chipLabels(page, 1)).toHaveText(['Fruit', 'Vegetables']);
    await expect(row(page, 1, 'Fruit')).toHaveAttribute('aria-selected', 'true');
  });

  test('checkbox + cascade demo cascades a checked parent to its loaded children', async ({ page }) => {
    await openTreeSelect(page, 2);
    await row(page, 2, 'Vegetables').locator('[data-tree-chevron]').click();
    await expect(row(page, 2, 'Carrot')).toBeVisible();
    await toggle(page, 2, 'Vegetables');
    await expect(row(page, 2, 'Carrot')).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => chipLabels(page, 2).count()).toBeGreaterThan(1);
  });

  test('keyboard: ArrowDown opens the panel and moves focus into the tree', async ({ page }) => {
    const input = select(page, 1).locator('input.ts-search');
    await input.focus();
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowDown');
    await expect(select(page, 1).locator('.ts-panel')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(row(page, 1, 'Fruit')).toBeFocused();
  });
});
