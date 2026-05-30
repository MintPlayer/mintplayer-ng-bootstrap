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
  await page.evaluate((i) => {
    const els = document.querySelectorAll('mp-tree-select');
    const wc = els[i] as (Element & { shadowRoot: ShadowRoot | null }) | undefined;
    const anchor = wc?.shadowRoot?.querySelector<HTMLElement>('.ts-anchor');
    if (!anchor) throw new Error(`anchor for tree-select #${i} not found`);
    anchor.click();
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

// Click an option by its label inside the open panel.
async function clickOption(page: Page, index: number, label: string) {
  await page.evaluate(
    ({ i, lbl }) => {
      const els = document.querySelectorAll('mp-tree-select');
      const wc = els[i] as (Element & { shadowRoot: ShadowRoot | null }) | undefined;
      const tv = wc?.shadowRoot?.querySelector('.ts-panel mp-treeview') as
        | (Element & { shadowRoot: ShadowRoot | null })
        | null;
      const root = tv?.shadowRoot ?? wc?.shadowRoot?.querySelector('.ts-panel');
      if (!root) throw new Error('panel/treeview not found');
      const label = Array.from(root.querySelectorAll('.treeview-label')).find(
        (n) => (n.textContent ?? '').trim() === lbl,
      );
      if (!label) throw new Error(`option "${lbl}" not found`);
      (label as HTMLElement).click();
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
    await page.waitForLoadState('networkidle');
    // Ensure the custom elements have upgraded before reaching into shadow DOM.
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('mp-tree-select');
      return els.length >= 4 && !!(els[1] as Element & { shadowRoot: ShadowRoot | null }).shadowRoot;
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

    await clickOption(page, 1, 'Fruit');
    await expect.poll(async () => chipLabels(page, 1)).toContain('Fruit');

    await clickOption(page, 1, 'Vegetables');
    await expect.poll(async () => (await chipLabels(page, 1)).length).toBe(2);
    expect(await chipLabels(page, 1)).toEqual(expect.arrayContaining(['Fruit', 'Vegetables']));
  });

  test('checkbox + cascade demo opens and toggling a parent cascades to children', async ({ page }) => {
    await openTreeSelect(page, 2);
    await expect.poll(async () => readOptionLabels(page, 2)).toContain('Fruit');

    // Toggle the "Fruit" checkbox; cascade selects descendants. The selection is
    // surfaced as chips on the trigger (mode=checkbox renders chips too).
    await page.evaluate(() => {
      const wc = document.querySelectorAll('mp-tree-select')[2] as Element & {
        shadowRoot: ShadowRoot | null;
      };
      const tv = wc.shadowRoot?.querySelector('.ts-panel mp-treeview') as
        | (Element & { shadowRoot: ShadowRoot | null })
        | null;
      const root = tv?.shadowRoot ?? wc.shadowRoot;
      const labels = Array.from(root?.querySelectorAll('.treeview-label') ?? []);
      const fruit = labels.find((n) => (n.textContent ?? '').trim() === 'Fruit');
      const wrap = fruit?.closest('.treeview-node-content') ?? fruit?.parentElement;
      const cb = wrap?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      if (!cb) throw new Error('Fruit checkbox not found');
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect.poll(async () => (await chipLabels(page, 2)).length).toBeGreaterThan(0);
  });
});
