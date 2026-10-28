import { test, expect, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Mirrors the mocks in query-builder.spec.ts so the a11y sweep doesn't
// depend on the .NET API container being up.
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 20 }),
    });
  });
}

test.describe('@a11y query-builder', () => {
  test('initial page state has no serious/critical axe violations', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/enterprise/query-builder');
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });
    await expect(page.locator('bs-query-builder').first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('main, .container, bs-query-builder')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blockers = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    if (blockers.length > 0) {
      const summary = blockers.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`).join('\n');
      throw new Error(`axe-core found ${blockers.length} blocker(s):\n${summary}`);
    }
  });

  test('after adding a condition row, no new serious/critical violations', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/enterprise/query-builder');
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });

    // The root group's "+ Add condition" button; the new row is rendered when the count is.
    const qb = page.locator('bs-query-builder').first();
    await qb.locator('.qb-add-condition').first().click();
    await expect(qb.locator('li.qb-row-condition')).toHaveCount(1);

    const results = await new AxeBuilder({ page })
      .include('main, .container, bs-query-builder')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blockers = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    if (blockers.length > 0) {
      const summary = blockers.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`).join('\n');
      throw new Error(`axe-core found ${blockers.length} blocker(s) after adding a condition:\n${summary}`);
    }
  });
});
