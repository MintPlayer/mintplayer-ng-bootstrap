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
async function countBodyRows(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const wc = document.querySelector('mp-datatable');
    if (!wc?.shadowRoot) return 0;
    return wc.shadowRoot.querySelectorAll('tbody tr[data-row-key]').length;
  });
}

async function totalDataLength(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const wc = document.querySelector('mp-datatable') as (HTMLElement & { data?: unknown[] }) | null;
    return wc?.data?.length ?? 0;
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

  test('virtual mode preloads every record and scrolls them', async ({ page }) => {
    await page.locator('bs-select select').selectOption('virtualScroll');

    // The wrapper drains every page from the fetcher in virtual mode, so
    // mp-datatable.data should hold all 200 mocked artists.
    await expect.poll(() => totalDataLength(page), {
      timeout: 5000,
      message: 'wrapper should preload every page into mp-datatable.data',
    }).toBe(200);

    // The viewport-driven virtualizer renders a subset of those 200 rows.
    const rendered = await countBodyRows(page);
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThanOrEqual(200);
  });

  test('paginated mode renders the mp-pagination footer with the correct total pages', async ({ page }) => {
    // Default mode is pagination. mp-pagination is inside mp-datatable's
    // shadow DOM. With 200 records and perPage=20, we expect 10 pages.
    const totalPagesFromFooter = await page.evaluate(() => {
      const datatable = document.querySelector('mp-datatable');
      const pagination = datatable?.shadowRoot?.querySelector('mp-pagination') as
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
    await select.selectOption('virtualScroll');
    await expect.poll(() => totalDataLength(page), { timeout: 5000 }).toBe(200);

    await select.selectOption('pagination');
    await expect.poll(() => totalDataLength(page), { timeout: 5000 }).toBe(20);

    await select.selectOption('virtualScroll');
    await expect.poll(() => totalDataLength(page), { timeout: 5000 }).toBe(200);

    expect(await countBodyRows(page)).toBeGreaterThan(0);
  });
});
