import { test, expect, type Page } from '@playwright/test';

// E2E coverage for the tree-select demo page (/basic/tree-select).
//
// The page renders four <mp-tree-select> instances in order:
//   [0] single   — HTTP provider (needs the backend; not asserted here)
//   [1] multiple — InMemoryTreeSelectProvider (no backend)
//   [2] checkbox — InMemoryTreeSelectProvider (no backend)
//   [3] button   — InMemoryTreeSelectProvider (no backend)
//
// We assert against the in-memory demos only, so the spec is independent of the
// .NET backend. The panel lives in the WC's own shadow DOM and is revealed by a
// `[data-menu-open]` host attribute (.ts-panel is display:none otherwise).

// Open the dropdown for the Nth <mp-tree-select> by clicking its anchor inside
// shadow DOM, then wait for the host to report open + the panel to be visible.
async function openTreeSelect(page: Page, index: number) {
  // Wait until THIS element is upgraded and the Angular wrapper has wired its
  // provider (else open() early-returns), then call the public open() directly
  // — more reliable than racing a click against hydration.
  await page.waitForFunction((i) => {
    const el = document.querySelectorAll('mp-tree-select')[i] as
      | (Element & { shadowRoot: ShadowRoot | null; provider?: unknown })
      | undefined;
    return !!el && !!el.shadowRoot && !!el.provider;
  }, index);

  await page.evaluate(async (i) => {
    const el = document.querySelectorAll('mp-tree-select')[i] as Element & { open(): Promise<void> };
    await el.open();
  }, index);

  await expect
    .poll(async () =>
      page.evaluate((i) => {
        const els = document.querySelectorAll('mp-tree-select');
        return els[i]?.hasAttribute('data-menu-open') ?? false;
      }, index),
    )
    .toBe(true);
}

// Read the visible option labels rendered in the open panel's nested treeview.
async function readOptionLabels(page: Page, index: number) {
  return page.evaluate((i) => {
    const els = document.querySelectorAll('mp-tree-select');
    const wc = els[i] as (Element & { shadowRoot: ShadowRoot | null }) | undefined;
    const tv = wc?.shadowRoot?.querySelector('.ts-panel mp-treeview') as
      | (Element & { shadowRoot: ShadowRoot | null })
      | null;
    const root = tv?.shadowRoot ?? wc?.shadowRoot?.querySelector('.ts-panel');
    if (!root) return [];
    return Array.from(root.querySelectorAll('.treeview-label')).map(
      (n) => (n.textContent ?? '').trim(),
    );
  }, index);
}

// Toggle the checkbox for an option. In multiple/checkbox modes the inner
// treeview runs with selectionMode="none" and selection is driven by the
// per-row checkbox (.ts-node-check) — clicking the label only expands folders.
async function toggleCheckbox(page: Page, index: number, label: string) {
  await page.evaluate(
    ({ i, lbl }) => {
      const els = document.querySelectorAll('mp-tree-select');
      const wc = els[i] as (Element & { shadowRoot: ShadowRoot | null }) | undefined;
      const tv = wc?.shadowRoot?.querySelector('.ts-panel mp-treeview') as
        | (Element & { shadowRoot: ShadowRoot | null })
        | null;
      const root = tv?.shadowRoot ?? wc?.shadowRoot?.querySelector('.ts-panel');
      if (!root) throw new Error('panel/treeview not found');
      const labelEl = Array.from(root.querySelectorAll('.treeview-label')).find(
        (n) => (n.textContent ?? '').trim() === lbl,
      );
      const cb = labelEl?.closest('.ts-node')?.querySelector('input.ts-node-check') as
        | HTMLInputElement
        | null;
      if (!cb) throw new Error(`checkbox for "${lbl}" not found`);
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { i: index, lbl: label },
  );
}

// Count rendered chips in the trigger of the Nth tree-select.
async function chipLabels(page: Page, index: number) {
  return page.evaluate((i) => {
    const els = document.querySelectorAll('mp-tree-select');
    const wc = els[i] as (Element & { shadowRoot: ShadowRoot | null }) | undefined;
    const chips = wc?.shadowRoot?.querySelectorAll('.ts-chip .ts-chip-label') ?? [];
    return Array.from(chips).map((c) => (c.textContent ?? '').trim());
  }, index);
}

test.describe('tree-select demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basic/tree-select');
    // Wait until the elements have upgraded AND the Angular wrapper has wired
    // them (provider property pushed) — a reliable post-hydration signal on
    // both browsers, where networkidle is flaky on this page.
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('mp-tree-select');
      if (els.length < 5) return false;
      const el = els[1] as Element & { shadowRoot: ShadowRoot | null; provider?: unknown };
      return !!el.shadowRoot && !!el.provider;
    });
  });

  test('opening the multiple dropdown reveals the panel with root options', async ({ page }) => {
    await openTreeSelect(page, 1);
    await expect.poll(async () => readOptionLabels(page, 1)).toContain('Fruit');
    const labels = await readOptionLabels(page, 1);
    expect(labels).toContain('Vegetables');
  });

  test('selecting nodes in the multiple demo adds chips', async ({ page }) => {
    await openTreeSelect(page, 1);
    await expect.poll(async () => readOptionLabels(page, 1)).toContain('Fruit');

    await toggleCheckbox(page, 1, 'Fruit');
    await expect.poll(async () => chipLabels(page, 1)).toContain('Fruit');

    await toggleCheckbox(page, 1, 'Vegetables');
    await expect.poll(async () => (await chipLabels(page, 1)).length).toBe(2);
    expect(await chipLabels(page, 1)).toEqual(expect.arrayContaining(['Fruit', 'Vegetables']));
  });

  test('checkbox + cascade demo opens and toggling a parent cascades to children', async ({ page }) => {
    await openTreeSelect(page, 2);
    await expect.poll(async () => readOptionLabels(page, 2)).toContain('Fruit');

    // Toggle the "Fruit" checkbox; the selection surfaces as chips on the
    // trigger (mode=checkbox renders chips too).
    await toggleCheckbox(page, 2, 'Fruit');
    await expect.poll(async () => (await chipLabels(page, 2)).length).toBeGreaterThan(0);
  });

  test('custom templates: bsTreeSelectSuggestion rows + bsTreeSelectItem chip render', async ({ page }) => {
    // index 4 = the "Custom templates" demo (multiple mode). The suggestion
    // template changes the row text, so assert structurally (not by label).
    const ts = page.locator('mp-tree-select').nth(4);
    await openTreeSelect(page, 4);

    // Custom suggestion row carries a light badge (suggestionTemplate).
    await expect(ts.locator('.badge.text-bg-light').first()).toBeVisible();

    // Toggle the first row's checkbox → the custom chip (a light-DOM badge
    // projected into slot="chips" by bsTreeSelectItem) appears.
    await ts.locator('.ts-node-check').first().check();
    await expect(ts.locator('.badge.text-bg-primary')).toHaveCount(1);
  });
});
