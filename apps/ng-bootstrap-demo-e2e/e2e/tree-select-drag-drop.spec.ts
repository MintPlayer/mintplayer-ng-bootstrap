import { test, expect, type Page, type Locator } from '@playwright/test';

// Validates that custom chips projected via slot="chips" (light DOM) with a
// cdkDragHandle actually drive Angular CDK drag-drop BETWEEN two connected
// bs-tree-select drop lists — i.e. dragging a chip transfers the selection.

test.describe('tree-select drag-drop — two connected lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/additional-samples/tree-select-drag-drop');
    // Wait on the rendered lists rather than networkidle (this page uses the
    // in-memory provider; networkidle can hang in Firefox here).
    await expect(page.locator('.ts-dnd-list')).toHaveCount(2);
    await expect(page.locator('.ts-dnd-list').first().locator('.ts-dnd-chip').first()).toBeVisible();
  });

  test('renders the seeded chips in both lists', async ({ page }) => {
    const a = page.locator('.ts-dnd-list').nth(0);
    const b = page.locator('.ts-dnd-list').nth(1);
    await expect(a.locator('.ts-dnd-chip')).toHaveCount(2);
    await expect(b.locator('.ts-dnd-chip')).toHaveCount(1);
  });

  test('dragging a chip from list A to list B transfers the selection', async ({ page }) => {
    const a = page.locator('.ts-dnd-list').nth(0);
    const b = page.locator('.ts-dnd-list').nth(1);
    await expect(a.locator('.ts-dnd-chip')).toHaveCount(2);
    await expect(b.locator('.ts-dnd-chip')).toHaveCount(1);

    const handle = a.locator('.ts-dnd-chip').first().locator('.ts-dnd-handle');
    await dragOnto(page, handle, b);

    // The chip moved across: B gains one, A loses one.
    await expect(b.locator('.ts-dnd-chip')).toHaveCount(2);
    await expect(a.locator('.ts-dnd-chip')).toHaveCount(1);
  });
});

/** Drive a CDK drag from `handle` onto the center of `target` via pointer steps. */
async function dragOnto(page: Page, handle: Locator, target: Locator) {
  const h = await handle.boundingBox();
  if (!h) throw new Error('missing handle bounding box');
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  // Cross CDK's drag-start threshold, then settle so the drag ref initializes.
  await page.mouse.move(h.x + h.width / 2 + 10, h.y + h.height / 2 + 10, { steps: 8 });
  await page.waitForTimeout(80);
  // Re-measure the target after the source became a placeholder (layout shifts).
  const t = await target.boundingBox();
  if (!t) throw new Error('missing target bounding box');
  const cx = t.x + t.width / 2;
  const cy = t.y + t.height / 2;
  await page.mouse.move(cx, cy, { steps: 25 });
  await page.waitForTimeout(80);
  // A small jiggle inside the target so CDK registers the container enter + sort.
  await page.mouse.move(cx + 4, cy + 2, { steps: 5 });
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(50);
}
