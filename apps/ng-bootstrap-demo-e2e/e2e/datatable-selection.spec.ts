import { test, expect, type Page, type Locator } from '@playwright/test';

// Row selection (#422) against the "Row selection" demo: a 'checkbox'-mode
// table with [fetch], perPage 10, [rowKey] = String(id), and a status line that
// shows the selection count, the selected keys and the last opened row.
//
// The artist API is mocked so the rows are deterministic: page N holds ids
// (N-1)*perPage+1 … N*perPage. The mock ignores sortColumns on purpose — a sort
// still drops the loaded pages and refetches, which is the reload the selection
// has to survive; the row ORDER is irrelevant to that.

const ARTISTS = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `Artist ${i + 1}`,
  yearStarted: 1960 + (i % 60),
  yearQuit: i % 5 === 0 ? null : 2000 + (i % 25),
}));

async function mockArtistApi(page: Page) {
  await page.route('**/api/v1/artist/page', async (route) => {
    const req = JSON.parse(route.request().postData() ?? '{}') as {
      page?: number; perPage?: number;
    };
    const page_ = req.page ?? 1;
    const perPage = req.perPage ?? 20;
    const start = (page_ - 1) * perPage;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: ARTISTS.slice(start, start + perPage),
        totalRecords: ARTISTS.length,
        totalPages: Math.ceil(ARTISTS.length / perPage),
        page: page_,
        perPage,
      }),
    });
  });
}

/** The 'checkbox'-mode demo table, by its named hook — never by position. */
function table(page: Page): Locator {
  return page.locator('bs-datatable.selection-table mp-datatable');
}

/** A body row by its key (tier L: rows are ordinary light-DOM descendants). */
function row(page: Page, key: string): Locator {
  return table(page).locator(`tbody tr[data-row-key="${key}"]`);
}

/**
 * Ticks a row through its checkbox cell. The click lands in the cell's top-left
 * corner, i.e. on the td padding rather than on the mp-checkbox: in 'checkbox'
 * mode the whole cell toggles, which is the behaviour under test.
 */
async function tickViaCellPadding(page: Page, key: string) {
  await row(page, key).locator('td.checkbox-cell').click({ position: { x: 2, y: 2 } });
}

async function goToPage(page: Page, n: number) {
  // mp-pagination keeps its buttons in an open shadow root; locators pierce it.
  await table(page)
    .locator('mp-pagination.datatable-pagination')
    .getByRole('button', { name: `Page ${n}`, exact: true })
    .click();
}

const count = (page: Page) => page.locator('.selection-count');
const keys = (page: Page) => page.locator('.selection-keys');
const opened = (page: Page) => page.locator('.selection-opened');

test.describe('bs-datatable row selection (#422)', () => {
  test.beforeEach(async ({ page }) => {
    await mockArtistApi(page);
    await page.goto('/enterprise/datatables');
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });
    await page.getByRole('heading', { name: 'Row selection', exact: true }).scrollIntoViewIfNeeded();
    // Readiness: page 1 has rendered real rows (not the SSR/first-paint shell).
    await expect(row(page, '1')).toBeVisible({ timeout: 5000 });
  });

  test('selection survives a page change and a sort', async ({ page }) => {
    await tickViaCellPadding(page, '1');
    await tickViaCellPadding(page, '2');
    await expect(count(page)).toHaveText('Selected 2 artist(s)');

    // Page 2 holds ids 11-20; the page-1 keys must stay selected while off-page.
    await goToPage(page, 2);
    await expect(row(page, '11')).toBeVisible();
    await tickViaCellPadding(page, '11');
    await expect(count(page)).toHaveText('Selected 3 artist(s)');
    await expect(keys(page)).toHaveText('1, 2, 11');

    // A sort drops the loaded pages and refetches; no key may be lost.
    await table(page).locator('th[data-column="Name"] button.header-sort').click();
    await expect(table(page).locator('th[data-column="Name"]')).toHaveAttribute('aria-sort', 'ascending');
    await expect(count(page)).toHaveText('Selected 3 artist(s)');
    await expect(keys(page)).toHaveText('1, 2, 11');

    // Back on page 1 the rows render as selected again.
    await goToPage(page, 1);
    await expect(row(page, '1')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, '2')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, '3')).toHaveAttribute('aria-selected', 'false');
    await expect(keys(page)).toHaveText('1, 2, 11');
  });

  test("checkbox mode: a row click opens without selecting; the checkbox cell selects", async ({ page }) => {
    // A click on a data cell is the row click: it opens the row and selects nothing.
    await row(page, '3').locator('td', { hasText: 'Artist 3' }).click();
    await expect(opened(page)).toHaveText('Opened: Artist 3');
    await expect(row(page, '3')).toHaveAttribute('aria-selected', 'false');
    await expect(count(page)).toHaveText('Selected 0 artist(s)');

    // A click in the checkbox cell's padding selects and does NOT open.
    await tickViaCellPadding(page, '4');
    await expect(row(page, '4')).toHaveAttribute('aria-selected', 'true');
    await expect(count(page)).toHaveText('Selected 1 artist(s)');
    await expect(opened(page)).toHaveText('Opened: Artist 3');

    // The same spot again toggles it off.
    await tickViaCellPadding(page, '4');
    await expect(row(page, '4')).toHaveAttribute('aria-selected', 'false');
    await expect(count(page)).toHaveText('Selected 0 artist(s)');
  });

  test('reload() keeps the selection', async ({ page }) => {
    await tickViaCellPadding(page, '5');
    await expect(count(page)).toHaveText('Selected 1 artist(s)');

    const refetch = page.waitForRequest('**/api/v1/artist/page');
    await page.locator('button.selection-reload').click();
    await refetch;

    await expect(row(page, '5')).toHaveAttribute('aria-selected', 'true');
    await expect(count(page)).toHaveText('Selected 1 artist(s)');
  });
});
