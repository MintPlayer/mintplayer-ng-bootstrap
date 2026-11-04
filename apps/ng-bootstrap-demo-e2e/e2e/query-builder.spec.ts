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
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });

  // The bs-query-builder host renders inside the page.
  const qb = page.locator('bs-query-builder').first();
  await expect(qb).toBeVisible();

  // bs-datatable fires its fetch on mount, so the initial state already shows
  // "2 matches" (the mocked response). No need to assert an empty state — we
  // only care that Search after editing the tree fires another fetch round.

  // Add a condition: the root group's "+ Add condition" button. The tree is
  // flat rows (#437), so the new condition is one more li.qb-row-condition.
  await qb.locator('.qb-add-condition').first().click();
  await expect(qb.locator('li.qb-row-condition')).toHaveCount(1);

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
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });

  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText(/INVALID_OPERATOR_FOR_TYPE/)).toBeVisible();
});

// ── Editing the tree ────────────────────────────────────────────────────
// Driven through the generated Angular front; the behaviour is the shared core's.

async function openBuilder(page: import('@playwright/test').Page) {
  await setupMocks(page);
  await page.goto('/enterprise/query-builder');
  // The server already rendered the tree: wait for the core to attach before editing it.
  const qb = page.locator('bs-query-builder[data-mp-hydrated]').first();
  await expect(qb).toBeVisible();
  return qb;
}

/** Adds `values.length` "Total equals <v>" conditions to the root group. */
async function addTotals(qb: import('@playwright/test').Locator, values: string[]) {
  const rows = qb.locator('li.qb-row-condition');
  for (const [k, v] of values.entries()) {
    await qb.locator('.qb-add-condition').first().click();
    await expect(rows).toHaveCount(k + 1);
    await rows.nth(k).locator('input.qb-editor-input').fill(v);
  }
  return rows;
}

/** The rows' values, top to bottom. */
const order = (rows: import('@playwright/test').Locator) =>
  rows.locator('input.qb-editor-input').evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));

test('query-builder: Enter adds a chip, × removes it', async ({ page }) => {
  const qb = await openBuilder(page);
  const row = (await addTotals(qb, ['1'])).first();
  await row.locator('select.qb-operator-select').selectOption('in');

  const chipInput = row.locator('input.qb-editor-chip-add');
  await chipInput.fill('12');
  await chipInput.press('Enter');
  await chipInput.fill('7.5');
  await chipInput.press('Enter');
  await expect(row.locator('.qb-editor-chip')).toHaveText([/12/, /7\.5/]);
  await expect(chipInput).toHaveValue('');

  await row.getByRole('button', { name: 'Remove 12' }).click();
  await expect(row.locator('.qb-editor-chip')).toHaveText([/7\.5/]);
  // Focus stays in the editor once the chip and its button are gone.
  await expect(chipInput).toBeFocused();
});

test('query-builder: Alt+Arrow moves a row and keeps it focused', async ({ page }) => {
  const qb = await openBuilder(page);
  const rows = await addTotals(qb, ['1', '2', '3']);

  await rows.nth(2).locator('.qb-condition').focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(() => order(rows)).toEqual(['1', '3', '2']);
  await expect(rows.nth(1).locator('.qb-condition')).toBeFocused();

  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(() => order(rows)).toEqual(['3', '1', '2']);
  // At the top: nothing to move past.
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(() => order(rows)).toEqual(['3', '1', '2']);
});

test('query-builder: a row dragged down its own group lands on the slot it was dropped on', async ({ page }) => {
  const qb = await openBuilder(page);
  const rows = await addTotals(qb, ['1', '2', '3']);

  const handle = rows.first().locator('.qb-drag-handle');
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // The slots render once the drag is live; slot 2 sits between the second and third rows.
  const slot = qb.locator('.qb-drop-slot[data-index="2"]').first();
  await expect(slot).toBeVisible();
  const target = (await slot.boundingBox())!;
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 5 });
  await page.mouse.up();

  await expect(qb.locator('.qb-drop-slot')).toHaveCount(0);
  await expect.poll(() => order(rows)).toEqual(['2', '1', '3']);
});
