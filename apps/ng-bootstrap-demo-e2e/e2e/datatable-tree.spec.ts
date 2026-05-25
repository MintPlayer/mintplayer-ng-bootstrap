import { test, expect, type Page, type Route } from '@playwright/test';

// ─── Deterministic tree fixture ──────────────────────────────────────────────
// Roots: 3 items, each with 2 direct children. Each L1 child has 2 grandkids.
//
//   1: Root A         (childCount: 2)
//     11: A-1         (childCount: 2)
//       111: A-1-a
//       112: A-1-b
//     12: A-2         (childCount: 0, leaf)
//   2: Root B         (childCount: 2)
//     21: B-1         (childCount: 0)
//     22: B-2         (childCount: 0)
//   3: Root C         (childCount: 0, leaf)
//
// Mocked at /api/treeItems (roots) and /api/treeItems/{id}/children.

interface TreeItem {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  headcount: number;
  childCount: number;
}

const ROOTS: TreeItem[] = [
  { id: 1, parentId: null, name: 'Root A', code: 'A', headcount: 10, childCount: 2 },
  { id: 2, parentId: null, name: 'Root B', code: 'B', headcount: 20, childCount: 2 },
  { id: 3, parentId: null, name: 'Root C', code: 'C', headcount: 30, childCount: 0 },
];

const CHILDREN_BY_PARENT: Record<string, TreeItem[]> = {
  '1': [
    { id: 11, parentId: 1, name: 'A-1', code: 'A.1', headcount: 5, childCount: 2 },
    { id: 12, parentId: 1, name: 'A-2', code: 'A.2', headcount: 5, childCount: 0 },
  ],
  '11': [
    { id: 111, parentId: 11, name: 'A-1-a', code: 'A.1.a', headcount: 2, childCount: 0 },
    { id: 112, parentId: 11, name: 'A-1-b', code: 'A.1.b', headcount: 3, childCount: 0 },
  ],
  '2': [
    { id: 21, parentId: 2, name: 'B-1', code: 'B.1', headcount: 10, childCount: 0 },
    { id: 22, parentId: 2, name: 'B-2', code: 'B.2', headcount: 10, childCount: 0 },
  ],
};

async function mockTreeApi(page: Page) {
  await page.route('**/api/treeItems**', async (route: Route) => {
    const url = new URL(route.request().url());
    // Match `/api/treeItems` (roots) — path ends with `/treeItems` exactly.
    if (url.pathname.endsWith('/api/treeItems')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: ROOTS, totalCount: ROOTS.length, page: 1, pageSize: 100 }),
      });
      return;
    }
    // Match `/api/treeItems/{id}/children`.
    const m = url.pathname.match(/\/api\/treeItems\/(\d+)\/children$/);
    if (m) {
      const parentId = m[1];
      const items = CHILDREN_BY_PARENT[parentId] ?? [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, totalCount: items.length, page: 1, pageSize: 100 }),
      });
      return;
    }
    await route.continue();
  });
}

// Read every visible body row (real + placeholder) out of the WC's shadow DOM.
async function readRows(page: Page) {
  return page.evaluate(() => {
    // Scope to the tree-mode datatable — last <mp-datatable> on the page,
    // which is the tree-mode example (the basic example comes first).
    const datatables = document.querySelectorAll('mp-datatable');
    const wc = datatables[datatables.length - 1];
    if (!wc?.shadowRoot) return [];
    const rows = wc.shadowRoot.querySelectorAll('tbody tr[data-row-key]');
    return Array.from(rows).map((row) => ({
      key: row.getAttribute('data-row-key') ?? '',
      depth: Number(row.getAttribute('data-depth') ?? '0'),
      ariaLevel: row.getAttribute('aria-level'),
      ariaExpanded: row.getAttribute('aria-expanded'),
      isPlaceholder: row.getAttribute('data-placeholder') === 'true',
    }));
  });
}

// Click a chevron inside the tree-mode datatable's shadow DOM by its
// aria-label. The chevron is `<button class="tree-chevron"
// aria-label="Expand row"|"Collapse row">`.
async function clickChevron(page: Page, rowKey: string) {
  await page.evaluate((key) => {
    const datatables = document.querySelectorAll('mp-datatable');
    const wc = datatables[datatables.length - 1];
    if (!wc?.shadowRoot) throw new Error('mp-datatable shadow root missing');
    const row = wc.shadowRoot.querySelector(`tr[data-row-key="${key}"]`);
    if (!row) throw new Error(`row ${key} not found`);
    const btn = row.querySelector('button.tree-chevron') as HTMLButtonElement | null;
    if (!btn) throw new Error(`chevron for row ${key} not found`);
    btn.click();
  }, rowKey);
}

test.describe('bs-datatable tree mode', () => {
  test.beforeEach(async ({ page }) => {
    await mockTreeApi(page);
    await page.goto('/enterprise/datatables');
    // Destructive-bootstrap demo: wait for the first paint + initial fetches
    // to land before interacting. The tree-mode section is below the
    // existing basic example — scroll it into view to mount/render.
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('heading', { name: /Tree mode/i })
      .scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
  });

  test('renders root rows with collapsed chevrons and aria-level=1', async ({ page }) => {
    const rows = await readRows(page);
    // Three roots, all collapsed, all at level 1.
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.depth).toBe(0);
      expect(row.ariaLevel).toBe('1');
      expect(row.isPlaceholder).toBe(false);
    }
    expect(rows.map((r) => r.key)).toEqual(['1', '2', '3']);
    // Root A and B have children, Root C is a leaf.
    expect(rows[0].ariaExpanded).toBe('false');
    expect(rows[1].ariaExpanded).toBe('false');
    expect(rows[2].ariaExpanded).toBeNull(); // no chevron on leaves
  });

  test('expanding a root row lazy-loads its children inline at depth 2', async ({ page }) => {
    await clickChevron(page, '1');
    // After lazy fetch resolves: root 1 expanded, two children appear under it.
    await expect.poll(async () => (await readRows(page)).length, { timeout: 2000 }).toBe(5);

    const rows = await readRows(page);
    expect(rows.map((r) => r.key)).toEqual(['1', '11', '12', '2', '3']);
    expect(rows[0].ariaExpanded).toBe('true');
    expect(rows[1].depth).toBe(1);
    expect(rows[1].ariaLevel).toBe('2');
    expect(rows[2].depth).toBe(1);
    expect(rows[2].ariaLevel).toBe('2');
    // The two children of root 1 are at level 2; A-1 still has a chevron
    // (childCount=2), A-2 is a leaf.
    expect(rows[1].ariaExpanded).toBe('false');
    expect(rows[2].ariaExpanded).toBeNull();
  });

  test('expanding a child row lazy-loads grandchildren at depth 3', async ({ page }) => {
    await clickChevron(page, '1');
    await expect.poll(async () => (await readRows(page)).length).toBe(5);
    await clickChevron(page, '11');
    // After second lazy fetch: 1 → [11 → [111, 112], 12], 2, 3 — total 7.
    await expect.poll(async () => (await readRows(page)).length, { timeout: 2000 }).toBe(7);

    const rows = await readRows(page);
    expect(rows.map((r) => r.key)).toEqual(['1', '11', '111', '112', '12', '2', '3']);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 2, 1, 0, 0]);
    expect(rows.map((r) => r.ariaLevel)).toEqual(['1', '2', '3', '3', '2', '1', '1']);
  });

  test('collapsing a row removes its descendants from the flat list', async ({ page }) => {
    await clickChevron(page, '1');
    await expect.poll(async () => (await readRows(page)).length).toBe(5);
    await clickChevron(page, '1'); // collapse
    await expect.poll(async () => (await readRows(page)).length).toBe(3);

    const rows = await readRows(page);
    expect(rows.map((r) => r.key)).toEqual(['1', '2', '3']);
    expect(rows[0].ariaExpanded).toBe('false');
  });

  test('re-expanding uses cache (no additional fetch)', async ({ page }) => {
    let childFetchCount = 0;
    await page.route('**/api/treeItems/1/children**', async (route) => {
      childFetchCount += 1;
      const items = CHILDREN_BY_PARENT['1'];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, totalCount: items.length, page: 1, pageSize: 100 }),
      });
    });

    await clickChevron(page, '1');
    await expect.poll(async () => (await readRows(page)).length).toBe(5);
    await clickChevron(page, '1'); // collapse
    await expect.poll(async () => (await readRows(page)).length).toBe(3);
    await clickChevron(page, '1'); // re-expand
    await expect.poll(async () => (await readRows(page)).length).toBe(5);

    // The /children/1 endpoint should only be hit once — the second expand
    // pulls children from the WC's in-memory cache.
    expect(childFetchCount).toBe(1);
  });

  test('table uses role=treegrid', async ({ page }) => {
    const role = await page.evaluate(() => {
      const datatables = document.querySelectorAll('mp-datatable');
      const wc = datatables[datatables.length - 1];
      return wc?.shadowRoot?.querySelector('table')?.getAttribute('role');
    });
    expect(role).toBe('treegrid');
  });
});
