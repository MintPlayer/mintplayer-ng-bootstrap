import { test, expect, type Page } from '@playwright/test';

/**
 * Column widths and column resizing in a real browser (#426). jsdom has no
 * layout, so the phantom scrollbar, touch arbitration and the overlay's
 * geometry can only be seen here.
 */

async function mockArtistApi(page: Page) {
  const artists = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    name: `Artist ${String(i + 1).padStart(2, '0')}`,
    yearStarted: 1960 + (i % 30),
    yearQuit: i % 4 === 0 ? null : 2000 + (i % 20),
  }));
  await page.route('**/api/v1/artist/page', async (route) => {
    const req = JSON.parse(route.request().postData() ?? '{}') as { page?: number; perPage?: number };
    const page_ = req.page ?? 1;
    const perPage = req.perPage ?? 20;
    const start = (page_ - 1) * perPage;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: artists.slice(start, start + perPage),
        totalRecords: artists.length,
        totalPages: Math.ceil(artists.length / perPage),
        page: page_,
        perPage,
      }),
    });
  });
}

const TABLE = '.resize-table mp-datatable';
const handle = (page: Page, column: string) =>
  page.locator(`${TABLE} thead tr:first-child th[data-column="${column}"] .resize-handle`);
/**
 * The column's PINNED width, not its rendered one: the table is 100% wide with
 * fixed layout, so surplus space is shared out across the columns and a 40px
 * drag can render as 30px. What the resize controls is the pin.
 */
const headerWidth = (page: Page, column: string) =>
  page.locator(`${TABLE} thead tr:first-child th[data-column="${column}"]`)
    .evaluate((th) => parseFloat((th as HTMLElement).style.width));

async function open(page: Page) {
  await mockArtistApi(page);
  await page.goto('/enterprise/datatables');
  // Measured once the first real rows are in: the .measured class is the signal.
  await expect(page.locator(`${TABLE} table.measured`)).toBeAttached();
}

/** Overflow of every datatable scroller on the page, plus whether its columns fit. */
async function overflows(page: Page) {
  return page.locator('mp-datatable .datatable-scroll').evaluateAll((scrollers) =>
    scrollers.map((s) => {
      const ths = [...s.querySelectorAll<HTMLElement>('thead tr:first-child th')];
      const natural = ths.reduce((sum, th) => sum + th.getBoundingClientRect().width, 0);
      return { overflow: s.scrollWidth - s.clientWidth, natural, client: s.clientWidth };
    }),
  );
}

test.describe('datatable column widths', () => {
  test('columns that fit produce no horizontal scrollbar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const results = await overflows(page);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results.filter((x) => x.natural <= x.client + 1)) {
      expect(r.overflow).toBe(0);
    }
  });

  test('columns that fitted are re-fitted when the window narrows after measuring', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const scroller = page.locator(`${TABLE} .datatable-scroll`);
    const fitted = await overflows(page);
    expect(fitted.every((r) => r.overflow === 0 || r.natural > r.client + 1)).toBe(true);

    await page.setViewportSize({ width: 1340, height: 900 });
    // The re-fit runs a frame after the ResizeObserver, hence the poll.
    await expect.poll(() => scroller.evaluate((s) => s.scrollWidth - s.clientWidth)).toBe(0);
  });

  test('wider content still scrolls horizontally on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await open(page);
    const results = await overflows(page);
    for (const r of results.filter((x) => x.natural > x.client + 1)) {
      expect(r.overflow).toBeGreaterThan(0);
    }
  });
});

test.describe('datatable column resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page);
  });

  test('the non-resizable actions column has no handle; the others do', async ({ page }) => {
    await expect(handle(page, 'Name')).toHaveCount(1);
    await expect(handle(page, 'actions')).toHaveCount(0);
    // Named by the header text, not the internal key.
    await expect(handle(page, 'Name')).toHaveAttribute('aria-label', 'Resize column Artist');
  });

  test('a mouse drag resizes; a click without moving opens the options', async ({ page }) => {
    const before = await headerWidth(page, 'Name');
    // The table is below the fold, and raw mouse coordinates do not scroll.
    await handle(page, 'Name').scrollIntoViewIfNeeded();
    const box = (await handle(page, 'Name').boundingBox())!;
    const x = box.x + box.width - 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y, { steps: 5 });
    await page.mouse.up();
    expect(await headerWidth(page, 'Name')).toBeGreaterThan(before + 30);
    await expect(page.locator('.resize-panel')).toHaveCount(0);

    await handle(page, 'Name').click();
    await expect(page.locator('.resize-panel')).toBeVisible();
  });

  test('the rendered column edge follows the pointer 1:1, in both directions', async ({ page }) => {
    // The demo table is narrower than its container, so fixed layout shares
    // slack across the columns: without the freeze on first resize the edge
    // drifted away from the cursor (#426 review).
    const rendered = () =>
      page.locator(`${TABLE} thead tr:first-child th[data-column="Name"]`)
        .evaluate((th) => th.getBoundingClientRect().right);
    await handle(page, 'Name').scrollIntoViewIfNeeded();
    const box = (await handle(page, 'Name').boundingBox())!;
    const x = box.x + box.width - 2;
    const y = box.y + box.height / 2;
    const edge = await rendered();

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 6 });
    expect(Math.abs((await rendered()) - (edge + 60))).toBeLessThanOrEqual(1);
    await page.mouse.move(x - 50, y, { steps: 10 });
    expect(Math.abs((await rendered()) - (edge - 50))).toBeLessThanOrEqual(1);
    await page.mouse.up();
  });

  test('Enter opens the options; the steps resize; Escape returns focus to the handle', async ({ page }) => {
    await handle(page, 'YearStarted').focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Resize options for Year started' });
    await expect(dialog).toBeVisible();

    const before = await headerWidth(page, 'YearStarted');
    await dialog.getByRole('button', { name: 'Make Year started wider' }).click();
    await expect.poll(() => headerWidth(page, 'YearStarted')).toBeGreaterThan(before + 5);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(handle(page, 'YearStarted')).toBeFocused();
  });
});

test.describe('datatable column resize by touch', () => {
  test.use({ hasTouch: true });

  /**
   * Real touch through CDP, which goes through the compositor's gesture
   * arbitration. A synthetic TouchEvent bypasses it and would pass even with
   * touch-action missing — the very regression this guards (#426 spike S2).
   */
  test('a finger drag on the handle resizes the column without panning the table', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP touch input is Chromium-only');
    await page.setViewportSize({ width: 412, height: 900 });
    await open(page);
    const scroller = page.locator(`${TABLE} .datatable-scroll`);
    const before = await headerWidth(page, 'Name');
    const scrollBefore = await scroller.evaluate((s) => s.scrollLeft);

    // Raw touch coordinates do not scroll the table into view.
    await handle(page, 'Name').scrollIntoViewIfNeeded();
    const box = (await handle(page, 'Name').boundingBox())!;
    const x = Math.round(box.x + box.width - 4);
    const y = Math.round(box.y + box.height / 2);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 6, y }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect.poll(() => headerWidth(page, 'Name')).toBeLessThan(before - 40);
    expect(await scroller.evaluate((s) => s.scrollLeft)).toBe(scrollBefore);
  });
});
