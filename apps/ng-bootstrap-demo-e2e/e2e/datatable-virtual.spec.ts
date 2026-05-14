import { test, expect, type Page } from '@playwright/test';

// Mock the artist API so the test is deterministic and offline-friendly.
// Names are deliberately wider than the "Artist" column header, which is
// what makes the regression visible: the header would size to ~80px while
// each body cell wants ~200px. The fix syncs them to the max.
async function mockArtistApi(page: Page) {
  const artists = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: i % 2 === 0
      ? `Long Artist Name ${i + 1} with extra padding`
      : `Short ${i + 1}`,
    yearStarted: 1960 + (i % 60),
    yearQuit: i % 5 === 0 ? null : 2000 + (i % 25),
  }));

  await page.route('**/api/v1/artist/page', async (route) => {
    const req = JSON.parse(route.request().postData() ?? '{}') as {
      page?: number; perPage?: number;
    };
    const page_ = req.page ?? 1;
    const perPage = req.perPage ?? 20;
    const start = (page_ - 1) * perPage;
    const slice = artists.slice(start, start + perPage);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: slice,
        totalRecords: artists.length,
        totalPages: Math.ceil(artists.length / perPage),
        page: page_,
        perPage,
      }),
    });
  });
}

// Returns the per-column |headerLeft - bodyLeft| in CSS pixels. Empty if
// the virtual viewport hasn't rendered a body row yet.
async function measureMisalignment(page: Page): Promise<number[]> {
  return await page.evaluate(() => {
    const headerCells = [...document.querySelectorAll('bs-datatable bs-table thead th')];
    const firstBodyRow = document.querySelector('cdk-virtual-scroll-viewport tbody tr');
    const bodyCells = [...(firstBodyRow?.querySelectorAll('td') ?? [])];
    if (!headerCells.length || !bodyCells.length) return [];
    return headerCells.map((h, i) => Math.abs(
      Math.round(h.getBoundingClientRect().left) -
      Math.round(bodyCells[i]?.getBoundingClientRect().left ?? 0),
    ));
  });
}

test.describe('bs-datatable virtual mode — header/body column alignment', () => {
  test.beforeEach(async ({ page }) => {
    await mockArtistApi(page);
    await page.goto('/enterprise/datatables');
    // SSR boot can race the route handler if we don't wait for the network
    // to settle before interacting with the page (see project_e2e_destructive_bootstrap).
    await page.waitForLoadState('networkidle');
  });

  test('columns align when virtual mode is activated from paginated start', async ({ page }) => {
    // Initial render is paginated mode. Flip into virtual:
    await page.locator('bs-select select').selectOption('virtualScroll');

    // Body row should appear once the priming fetch resolves. The column-
    // width sync re-wires inside a requestAnimationFrame after the viewport
    // mounts, then re-measures inside another rAF after each MutationObserver
    // batch. Poll until the alignment settles.
    await page.waitForSelector('cdk-virtual-scroll-viewport tbody tr');
    await expect.poll(
      async () => {
        const deltas = await measureMisalignment(page);
        return deltas.length === 0 ? Number.POSITIVE_INFINITY : Math.max(...deltas);
      },
      { timeout: 5000, message: 'header and body column lefts should align' },
    ).toBeLessThanOrEqual(1);
  });

  test('alignment survives a pagination ↔ virtual toggle cycle', async ({ page }) => {
    const select = page.locator('bs-select select');

    // virtual → paginated → virtual. The second entry into virtual mode is
    // what `ngAfterViewInit` used to miss before the fix: viewport queries
    // returned null because the DOM had been recreated.
    await select.selectOption('virtualScroll');
    await page.waitForSelector('cdk-virtual-scroll-viewport tbody tr');
    await page.waitForTimeout(400);

    await select.selectOption('pagination');
    await page.waitForSelector('bs-datatable bs-table tbody tr');
    await page.waitForTimeout(200);

    await select.selectOption('virtualScroll');
    await page.waitForSelector('cdk-virtual-scroll-viewport tbody tr');

    await expect.poll(
      async () => {
        const deltas = await measureMisalignment(page);
        return deltas.length === 0 ? Number.POSITIVE_INFINITY : Math.max(...deltas);
      },
      { timeout: 5000, message: 'alignment should re-establish after a toggle cycle' },
    ).toBeLessThanOrEqual(1);
  });

  test('alignment survives a vertical scroll that fetches a new page', async ({ page }) => {
    await page.locator('bs-select select').selectOption('virtualScroll');
    await page.waitForSelector('cdk-virtual-scroll-viewport tbody tr');
    await page.waitForTimeout(400);

    // Scroll deep enough to require fetching at least one more page.
    await page.evaluate(() => {
      const vp = document.querySelector('cdk-virtual-scroll-viewport') as HTMLElement | null;
      if (vp) vp.scrollTop = 1200;
    });

    await expect.poll(
      async () => {
        const deltas = await measureMisalignment(page);
        return deltas.length === 0 ? Number.POSITIVE_INFINITY : Math.max(...deltas);
      },
      { timeout: 5000, message: 'alignment should hold after scroll-triggered page fetch' },
    ).toBeLessThanOrEqual(1);
  });
});
