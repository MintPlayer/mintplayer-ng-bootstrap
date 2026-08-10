import type { Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

export interface ChartsSuiteOptions {
  /** Framework name for the suite title, e.g. `ng`. */
  framework: string;
  /** Demo route the charts page lives on. Defaults to the shared path. */
  path?: string;
}

/**
 * The charts family's behaviour, asserted per framework from the demo apps
 * (repo convention: verify through the wrappers and demos, never a synthetic
 * harness). Parameterised like `accordion-suites.ts` / `carousel-suites.ts`.
 *
 * Deliberately narrow — geometry and ARIA attributes are covered by the WC's
 * vitest specs, which a browser adds nothing to. What only a real browser can
 * prove is what this checks: that clicking an arc re-roots through the whole
 * wrapper stack, that the keyboard path reaches a shadow-DOM SVG node and its
 * focus lands there (the S1 risk), and that switching `layout` swaps SVG for
 * HTML without losing the tree.
 *
 * `deepActive` is needed throughout: `document.activeElement` stops at the
 * outermost host, so a focused `<path>` inside a shadow root is invisible to it.
 */
export function chartsSuite(test: Test, expect: Expect, options: ChartsSuiteOptions): void {
  const path = options.path ?? '/enterprise/charts';

  const deepActive = (page: Page) =>
    page.evaluate(() => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active
        ? { tag: active.tagName.toLowerCase(), id: active.getAttribute('data-id'), role: active.getAttribute('role') }
        : null;
    });

  test.describe(`${options.framework} charts`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      // Wait on the rendered tree rather than networkidle: the chart only has a
      // role-bearing node once its data property has been assigned by the wrapper.
      await page.waitForSelector('mp-hierarchy-chart [role="tree"]');
    });

    test('hierarchy: clicking a folder re-roots, the center control zooms back out', async ({ page }) => {
      const chart = page.locator('mp-hierarchy-chart').first();
      const zoomOut = chart.locator('.center-control');
      await expect(zoomOut).toBeDisabled();

      // Clicked in the ICICLE layout on purpose. A ring arc's bounding box is
      // centred on the chart's hole, so Playwright's default click point (the
      // box centre) lands in the middle of the donut rather than on the arc —
      // a harness artifact, not a user-facing one. A rectangular cell has no
      // such gap between its box and its ink. The sunburst's own click path is
      // covered by the keyboard test below and by the axe walk.
      await page.getByRole('button', { name: 'icicle' }).click();
      // `:not(.focus-cell)` matters: the focus column is itself a treeitem, and
      // clicking it at the root is a deliberate no-op (it is the zoom-out target).
      await chart.locator('div[role="treeitem"][aria-expanded="true"]:not(.focus-cell)').first().click();
      await expect.poll(() => chart.getAttribute('root-id')).not.toBeNull();

      // Each layout owns its own zoom-out affordance (centre circle, focus
      // column, breadcrumb header), so `.center-control` exists only in the
      // sunburst — switching back also proves the zoom state survives the
      // projection change.
      await page.getByRole('button', { name: 'sunburst' }).click();
      await expect(zoomOut).toBeEnabled();

      await zoomOut.click();
      await expect(zoomOut).toBeDisabled();
      expect(await chart.getAttribute('root-id')).toBeNull();
    });

    test('hierarchy: keyboard reaches the shadow SVG arcs and Escape zooms out', async ({ page }) => {
      const chart = page.locator('mp-hierarchy-chart').first();
      await chart.locator('[role="treeitem"]').first().focus();
      expect(await deepActive(page)).toMatchObject({ tag: 'path', role: 'treeitem' });

      const first = (await deepActive(page))!.id;
      await page.keyboard.press('ArrowRight');
      expect((await deepActive(page))!.id).not.toBe(first);

      await page.keyboard.press('Enter'); // re-root on the focused folder
      await expect(chart.locator('.center-control')).toBeEnabled();
      // Focus survived into the new window, so Escape is delivered to the chart.
      expect(await deepActive(page)).toMatchObject({ role: 'treeitem' });
      await page.keyboard.press('Escape');
      await expect(chart.locator('.center-control')).toBeDisabled();
    });

    test('hierarchy: switching layout swaps SVG arcs for HTML cells, tree intact', async ({ page }) => {
      const chart = page.locator('mp-hierarchy-chart').first();
      await expect(chart.locator('svg [role="treeitem"]')).not.toHaveCount(0);

      await page.getByRole('button', { name: 'icicle' }).click();
      await expect(chart.locator('.icicle')).toBeVisible();
      await expect(chart.locator('div[role="treeitem"]')).not.toHaveCount(0);

      await page.getByRole('button', { name: 'treemap' }).click();
      await expect(chart.locator('.treemap')).toBeVisible();
      await expect(chart.locator('[role="tree"]')).toHaveCount(1);

      await page.getByRole('button', { name: 'sunburst' }).click();
      await expect(chart.locator('svg [role="treeitem"]')).not.toHaveCount(0);
    });

    test('trend: points are keyboard-walkable buttons; sparkline is a named image', async ({ page }) => {
      const trend = page.locator('mp-trend-chart').first();
      await trend.locator('.point').first().focus();
      expect(await deepActive(page)).toMatchObject({ tag: 'circle', role: 'button' });

      const label = async () =>
        page.evaluate(() => {
          let active: Element | null = document.activeElement;
          while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
          return active?.getAttribute('aria-label');
        });
      const before = await label();
      await page.keyboard.press('ArrowRight');
      expect(await label()).not.toBe(before);

      const sparkline = page.locator('mp-sparkline').first().locator('svg[role="img"]');
      await expect(sparkline).toHaveAttribute('aria-label', /\d/);
    });
  });
}
