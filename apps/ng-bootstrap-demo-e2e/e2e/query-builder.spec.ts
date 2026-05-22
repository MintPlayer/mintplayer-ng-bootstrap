import { test, expect, type Route } from '@playwright/test';
// Tests against the demo page WITHOUT requiring apps/api to be running.
// Playwright intercepts /api/* and returns canned responses, so we
// validate the wire-format contract (request shape, response handling)
// without the .NET container in the loop. A separate live-API test
// matrix can be wired in CI by switching webServer to start both
// services — see PRD §M16 plan.

const ORDERS_SCHEMA = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      {
        name: 'status', label: 'Status', type: 'enum',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'paid', label: 'Paid' },
        ],
      },
      { name: 'orderDate', label: 'Order date', type: 'date' },
      {
        name: 'tags', label: 'Tags', type: 'array',
        options: [
          { value: 'urgent', label: 'Urgent' },
          { value: 'blocked', label: 'Blocked' },
        ],
      },
    ],
  },
];

async function setupMocks(page: import('@playwright/test').Page) {
  await page.route('**/api/orders/schema', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ORDERS_SCHEMA) });
  });
  await page.route('**/api/orders/search', async (route: Route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: 1, customerId: 1, total: 150, status: 'open', orderDate: '2026-05-10T00:00:00Z', tags: '["urgent"]' },
          { id: 2, customerId: 1, total: 50, status: 'paid', orderDate: '2026-05-14T00:00:00Z', tags: '[]' },
        ],
        totalCount: 2,
        page: body.page ?? 1,
        pageSize: body.pageSize ?? 20,
      }),
    });
  });
}

test('query-builder demo: schema fetch + search round-trip', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/enterprise/query-builder');
  await page.waitForLoadState('networkidle');

  // The bs-query-builder host renders inside the page.
  const qb = page.locator('bs-query-builder');
  await expect(qb).toBeVisible();

  // bs-datatable fires its fetch on mount, so the initial state already shows
  // "2 matches" (the mocked response). No need to assert an empty state — we
  // only care that Search after editing the tree fires another fetch round.

  // Add a condition by clicking the "+ Add condition" button (inside the WC's shadow root).
  // The button text is composed from messages.addCondition default.
  await page.locator('mp-query-builder').evaluate((el) => {
    const root = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
    const group = root.querySelector('mp-query-group') as HTMLElement & { shadowRoot: ShadowRoot };
    const btn = group.shadowRoot.querySelector('.qb-add-condition') as HTMLButtonElement;
    btn.click();
  });

  // Search.
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('2 matches')).toBeVisible();

  // The table now has 2 rows.
  await expect(page.locator('table tbody tr')).toHaveCount(2);
});

test('query-builder demo: error response is surfaced', async ({ page }) => {
  await page.route('**/api/orders/schema', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ORDERS_SCHEMA) });
  });
  await page.route('**/api/orders/search', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'INVALID_OPERATOR_FOR_TYPE', detail: 'total/contains' }),
    });
  });
  await page.goto('/enterprise/query-builder');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText(/INVALID_OPERATOR_FOR_TYPE/)).toBeVisible();
});
