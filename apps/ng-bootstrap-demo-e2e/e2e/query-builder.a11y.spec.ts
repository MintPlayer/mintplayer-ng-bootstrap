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
    await page.waitForLoadState('networkidle');
    await expect(page.locator('bs-query-builder')).toBeVisible();

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
    await page.waitForLoadState('networkidle');

    // Click the "+ Add condition" button inside the WC's shadow root.
    await page.locator('mp-query-builder').evaluate((el) => {
      const root = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
      const group = root.querySelector('mp-query-group') as HTMLElement & { shadowRoot: ShadowRoot };
      const btn = group.shadowRoot.querySelector('.qb-add-condition') as HTMLButtonElement;
      btn.click();
    });
    // Let the WC settle.
    await page.waitForTimeout(100);

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
