import { test, expect } from '@playwright/test';
// Live-API contract smoke tests. No mocks — the demo's /api/* requests are
// proxied to the running dotnet container. Assertions verify the wire-format
// contract holds end-to-end, NOT specific seed counts (the seed populates
// ~1000 orders, but exact totals are not part of the contract).

test('live API: schema endpoint responds and the WC mounts', async ({ page, request }) => {
  // Direct API call — must respond 200 with an EntitySchema[] body.
  const schemaResp = await request.get('http://localhost:5000/api/orders/schema');
  expect(schemaResp.ok()).toBe(true);
  const schema = await schemaResp.json();
  expect(Array.isArray(schema)).toBe(true);
  expect(schema[0]?.name).toBe('orders');
  expect(Array.isArray(schema[0]?.fields)).toBe(true);

  // The demo page consumes the same endpoint via proxy.
  await page.goto('/enterprise/query-builder');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('bs-query-builder')).toBeVisible();
});

test('live API: empty-tree search returns a non-empty paged result', async ({ page }) => {
  await page.goto('/enterprise/query-builder');
  await page.waitForLoadState('networkidle');

  // Empty AND-group → matches everything per Appendix A.
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });

  const matchText = await page.locator('text=/\\d+ match(?:es)?/').first().textContent();
  const count = parseInt(matchText?.match(/(\d+)/)?.[1] ?? '0', 10);
  expect(count).toBeGreaterThan(0);
});

test('live API: invalid operator is surfaced as a 400 error', async ({ page, request }) => {
  // Direct API call with a deliberately invalid operator → 400 with typed code.
  const resp = await request.post('http://localhost:5000/api/orders/search', {
    data: {
      query: {
        kind: 'group',
        id: '00000000-0000-4000-8000-000000000001',
        logic: 'and',
        children: [
          {
            kind: 'condition',
            id: '00000000-0000-4000-8000-000000000002',
            field: 'total',
            // 'contains' is not valid for type 'number'.
            operator: 'contains',
            value: 'oops',
          },
        ],
      },
      page: 1,
      pageSize: 20,
    },
  });
  expect(resp.status()).toBe(400);
  const body = await resp.json();
  expect(body.code).toBe('INVALID_OPERATOR_FOR_TYPE');
});
