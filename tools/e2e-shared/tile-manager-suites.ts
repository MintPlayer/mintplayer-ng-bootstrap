import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

/**
 * One suite for the three tile-manager demo pages (#440). The pages are three fronts of one
 * headless core, so they must behave identically. Each page renders the same six panels on a
 * region named "Demo dashboard", a "Stack below" select, an "Edit layout" switch, a Panels and a
 * Lock checklist, a "Board width" and a "Columns" badge, and persists `layouts` to
 * localStorage under `tile-manager-demo-layouts-v2`.
 *
 * Found by role, name and the core's `data-*` contract, never by framework-specific markup.
 */
export interface TileManagerSuiteOptions {
  path: string;
}

const STORAGE_KEY = 'tile-manager-demo-layouts-v2';
const MIN_COLUMN_WIDTH = 200;

interface Rect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

const board = (page: Page): Locator => page.getByRole('region', { name: 'Demo dashboard' });
const tile = (page: Page, id: string): Locator => board(page).locator(`[data-tile-id="${id}"]`);

/** Measured: the machine resolved a column count and a tile is in the tab order. */
async function measured(page: Page, expect: Expect): Promise<void> {
  await expect(board(page).locator('[data-tile-id][tabindex="0"]')).toHaveCount(1);
}

async function columns(page: Page): Promise<number> {
  const text = await page.locator('p', { hasText: 'Columns:' }).locator('.badge.text-bg-primary').innerText();
  return Number(text);
}

async function boardWidth(page: Page): Promise<number> {
  const text = await page.locator('p', { hasText: 'Board width:' }).locator('.badge.text-bg-secondary').innerText();
  return Number.parseInt(text, 10);
}

/** Tile boxes relative to the grid, rounded: comparable across a resize round trip. */
function rects(page: Page): Promise<Rect[]> {
  return board(page).evaluate((root) => {
    const grid = root.querySelector('.tile-grid')!.getBoundingClientRect();
    return [...root.querySelectorAll<HTMLElement>('[data-tile-id]')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.dataset['tileId']!,
        left: Math.round(r.left - grid.left),
        top: Math.round(r.top - grid.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });
  });
}

/** Where each tile sits, without its width: that wobbles by a sub-pixel when the page height changes. */
function placement(boxes: Rect[]): Omit<Rect, 'width'>[] {
  return boxes.map(({ width: _width, ...box }) => box);
}

function gridWidth(page: Page): Promise<number> {
  return board(page).evaluate((root) => Math.round(root.querySelector('.tile-grid')!.getBoundingClientRect().width));
}

function stored(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
}

/** The grid's column tracks, as the browser resolved them. */
function tracks(page: Page): Promise<number[]> {
  return board(page).evaluate((root) =>
    getComputedStyle(root.querySelector('.tile-grid')!).gridTemplateColumns.split(' ').map((t) => Number.parseFloat(t)),
  );
}

/**
 * Wait until the FLIP animation (and any transition) has settled. The animation starts a frame
 * after the change renders, so first let two frames pass: checked any earlier, nothing is running
 * yet and the tiles still sit at their inverted (old) position.
 */
async function settled(page: Page): Promise<void> {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
}

/**
 * Size the viewport so the board is `target` px wide. The page chrome around the board is not a
 * constant (the sidebar collapses below md, and the container steps between widths), so correct
 * from the measured width until it lands.
 */
async function boardAt(page: Page, expect: Expect, target: number): Promise<number> {
  let viewport = page.viewportSize()!.width;
  let width = await boardWidth(page);
  for (let i = 0; i < 5 && width !== target; i++) {
    viewport += target - width;
    await page.setViewportSize({ width: viewport, height: 900 });
    const previous = width;
    await expect.poll(() => boardWidth(page)).not.toBe(previous);
    width = await boardWidth(page);
  }
  return width;
}

/** Move the first tile one row down with the keyboard, committing with Enter. */
async function keyboardMove(page: Page, expect: Expect): Promise<void> {
  const first = board(page).locator('[data-tile-id][tabindex="0"]');
  await first.focus();
  await page.keyboard.press('m');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(first).toBeFocused();
}

export function tileManagerSuite(test: Test, expect: Expect, { path }: TileManagerSuiteOptions) {
  test.describe('tile-manager', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
      await page.reload();
      await measured(page, expect);
    });

    for (const width of [390, 700, 1280, 2560]) {
      test(`at ${width}px: no tile is narrower than a column, nothing overflows, the columns fill the width`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => boardWidth(page)).toBeLessThan(width + 1);
        await settled(page);
        const full = await gridWidth(page);
        const boxes = await rects(page);
        expect(boxes).toHaveLength(6);
        for (const box of boxes) {
          expect(box.width === full || box.width >= MIN_COLUMN_WIDTH, `${box.id} is ${box.width}px wide`).toBe(true);
        }
        // The grid has exactly the resolved columns, and they span the board. Whether the default
        // placement fills the last column is the layout's business; an extra, empty track is not.
        const cols = await tracks(page);
        expect(cols).toHaveLength(await columns(page));
        const gap = await board(page).evaluate((root) => Number.parseFloat(getComputedStyle(root.querySelector('.tile-grid')!).columnGap) || 0);
        expect(cols.reduce((sum, t) => sum + t, 0) + gap * (cols.length - 1)).toBeGreaterThanOrEqual(full - 2);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      });
    }

    test('stackBelow: stacked just below the threshold, not just above it', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.getByRole('combobox', { name: 'Stack below' }).selectOption('768');
      expect(await boardAt(page, expect, 760)).toBeLessThan(768);
      await expect.poll(() => columns(page)).toBe(1);
      expect(await boardAt(page, expect, 780)).toBeGreaterThanOrEqual(768);
      await expect.poll(() => columns(page)).toBeGreaterThan(1);
    });

    test('narrow → wide restores the wide layout exactly', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await settled(page);
      const wide = await rects(page);
      await page.setViewportSize({ width: 390, height: 900 });
      await expect.poll(() => columns(page)).toBe(1);
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect.poll(() => columns(page)).toBeGreaterThan(1);
      await settled(page);
      expect(await rects(page)).toEqual(wide);
    });

    test('an edit at 1 column is stored under 1 and leaves the wide layout untouched', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect.poll(() => columns(page)).toBeGreaterThan(1);
      const wideCount = String(await columns(page));
      await keyboardMove(page, expect);
      await expect.poll(async () => Object.keys(await stored(page))).toContain(wideCount);
      const wideLayout = (await stored(page))[wideCount];

      await page.setViewportSize({ width: 390, height: 900 });
      await expect.poll(() => columns(page)).toBe(1);
      await keyboardMove(page, expect);
      await expect.poll(async () => Object.keys(await stored(page))).toContain('1');
      expect((await stored(page))[wideCount]).toEqual(wideLayout);
    });

    test('hiding a tile and showing it again returns it to its spot', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await settled(page);
      const before = (await rects(page)).find((r) => r.id === 'inbox');
      const panels = page.locator('.tile-demo-checklist').first();
      await panels.getByText('Inbox', { exact: true }).click();
      await expect(tile(page, 'inbox')).toHaveCount(0);
      await panels.getByText('Inbox', { exact: true }).click();
      await expect(tile(page, 'inbox')).toHaveCount(1);
      await settled(page);
      expect((await rects(page)).find((r) => r.id === 'inbox')).toEqual(before);
    });

    test('keyboard at 390px: one tab stop, arrows move focus, Escape reverts a move', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await expect.poll(() => columns(page)).toBe(1);
      const first = board(page).locator('[data-tile-id][tabindex="0"]');
      await first.focus();
      const firstId = await first.getAttribute('data-tile-id');
      await expect(board(page).locator('[data-tile-id][tabindex="0"]')).toHaveCount(1);

      await page.keyboard.press('ArrowDown');
      const second = board(page).locator('[data-tile-id][tabindex="0"]');
      await expect(second).not.toHaveAttribute('data-tile-id', firstId!);
      await expect(second).toBeFocused();

      await settled(page);
      const initial = placement(await rects(page));
      await page.keyboard.press('m');
      await page.keyboard.press('ArrowDown');
      await settled(page);
      expect(placement(await rects(page))).not.toEqual(initial);
      await page.keyboard.press('Escape');
      await settled(page);
      expect(placement(await rects(page))).toEqual(initial);
      await expect(second).toBeFocused();
    });

    test('axe: clean in move mode and in read-only mode', async ({ page }) => {
      const audit = async () =>
        (
          await new AxeBuilder({ page })
            .include('.mp-tile-manager')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
            .disableRules(['color-contrast'])
            .analyze()
        ).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);

      await board(page).locator('[data-tile-id][tabindex="0"]').focus();
      await page.keyboard.press('m');
      expect(await audit()).toEqual([]);
      await page.keyboard.press('Escape');

      await page.getByText('Edit layout', { exact: true }).click();
      await expect(board(page).locator('[data-drag-handle]')).toHaveCount(0);
      expect(await audit()).toEqual([]);
    });
  });
}

/**
 * No JS (ng only: the Angular front server-renders its template). The inline `@container`
 * rules place every tile (D14): side by side on a wide page, stacked on a narrow one.
 */
export function tileManagerNojsSuite(test: Test, expect: Expect, { path }: TileManagerSuiteOptions) {
  test.describe('tile-manager without JS', () => {
    test('wide: tiles sit side by side', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      const boxes = await rects(page);
      expect(boxes).toHaveLength(6);
      expect(new Set(boxes.map((b) => b.top)).size).toBeLessThan(6);
    });

    test('narrow: tiles stack at full width', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(path);
      const full = await gridWidth(page);
      const boxes = await rects(page);
      expect(boxes).toHaveLength(6);
      expect(boxes.every((b) => b.left === 0 && b.width === full)).toBe(true);
    });
  });
}
