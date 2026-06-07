import { test, expect, type Page } from '@playwright/test';

// Mock the artist API so the test is deterministic and offline-friendly.
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

// Read rows out of the mp-datatable's shadow DOM. The Lit WC renders a single
// <table> inside shadow root, so we have to reach in via evaluate().
// Count only the *materialized* rows — placeholders (rows whose page hasn't
// been fetched yet) are excluded. In lazy virtual mode this stays a small
// viewport-sized window, never the full result set.
async function countRealRows(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const wc = document.querySelector('mp-datatable');
    if (!wc?.shadowRoot) return 0;
    return wc.shadowRoot.querySelectorAll('tbody tr[data-row-key]:not([data-placeholder="true"])').length;
  });
}

// totalRecords is now DERIVED from the fetch response by the WC itself — the
// consumer never sets it. Reading it back proves the fetch loop ran and the
// virtualizer knows the full size without having drained every page.
async function totalRecords(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const wc = document.querySelector('mp-datatable') as (HTMLElement & { totalRecords?: number | null }) | null;
    return wc?.totalRecords ?? 0;
  });
}

test.describe('bs-datatable virtual mode', () => {
  test.beforeEach(async ({ page }) => {
    await mockArtistApi(page);
    await page.goto('/enterprise/datatables');
    // SSR boot can race the route handler if we don't wait for the network
    // to settle before interacting with the page (see project_e2e_destructive_bootstrap).
    await page.waitForLoadState('networkidle');
  });

  test('virtual mode lazily fetches only the viewport window, never the full set', async ({ page }) => {
    await page.locator('bs-select select').selectOption('virtualScroll');

    // The WC owns the fetch loop: it fetches page 1, derives totalRecords from
    // the response (200), and reserves scroll space for all of them — WITHOUT
    // draining every page. The consumer never sets totalRecords.
    await expect.poll(() => totalRecords(page), {
      timeout: 5000,
      message: 'WC should derive totalRecords from the first fetch response',
    }).toBe(200);

    // Lazy proof: only a viewport-sized window of rows is materialized. If the
    // table had eager-drained all 200 pages, every row would be real.
    const real = await countRealRows(page);
    expect(real).toBeGreaterThan(0);
    expect(real).toBeLessThan(200);
  });

  test('paginated mode renders the mp-pagination footer with the correct total pages', async ({ page }) => {
    // Default mode is pagination. The footer now contains TWO mp-pagination
    // instances — the rows-per-page selector first (.datatable-per-page,
    // pageNumbers = [10, 20, 50]) and the page navigator second
    // (.datatable-pagination, pageNumbers = [1…totalPages]). Scope the
    // query to the navigator. With 200 records and perPage=20 we expect 10
    // pages.
    const totalPagesFromFooter = await page.evaluate(() => {
      const datatable = document.querySelector('mp-datatable');
      const pagination = datatable?.shadowRoot?.querySelector('mp-pagination.datatable-pagination') as
        | (HTMLElement & { pageNumbers?: number[] })
        | null;
      return pagination?.pageNumbers?.length ?? 0;
    });
    expect(totalPagesFromFooter).toBe(10);
  });

  test('toggling pagination ↔ virtual keeps the table functional', async ({ page }) => {
    const select = page.locator('bs-select select');

    // virtual → pagination → virtual: this used to hit a CDK viewport
    // re-query bug; with a single-table WC it just needs to keep rendering.
    // totalRecords stays 200 (server-derived) across both modes; what changes
    // is how many rows are materialized.
    await select.selectOption('virtualScroll');
    await expect.poll(() => totalRecords(page), { timeout: 5000 }).toBe(200);
    expect(await countRealRows(page)).toBeGreaterThan(0);

    // Pagination renders exactly one page worth of rows (perPage = 20).
    await select.selectOption('pagination');
    await expect.poll(() => countRealRows(page), { timeout: 5000 }).toBe(20);
    expect(await totalRecords(page)).toBe(200);

    await select.selectOption('virtualScroll');
    await expect.poll(() => totalRecords(page), { timeout: 5000 }).toBe(200);
    expect(await countRealRows(page)).toBeGreaterThan(0);
  });
});
