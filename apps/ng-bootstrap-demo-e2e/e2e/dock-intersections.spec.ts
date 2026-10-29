import { test, expect, Page } from '@playwright/test';

/**
 * Restores a layout through the demo's "Apply layout JSON" control, waits for
 * its floating windows to render, then for the intersection handles to settle
 * (they are measured after a short debounce, once the splitters hold their
 * weights). Returns the number of handles the dock ends up rendering.
 */
async function countHandlesForLayout(page: Page, layout: { floating: unknown[] }): Promise<number> {
  await page.getByLabel('Layout JSON').fill(JSON.stringify(layout));
  await page.getByRole('button', { name: 'Apply layout JSON' }).click();
  const dock = page.locator('bs-dock-manager');
  await expect(dock.locator('.dock-floating')).toHaveCount(layout.floating.length);
  await page.waitForTimeout(300);
  return await dock.locator('.dock-intersection-handle').count();
}

test.describe('bs-dock-manager — cross-layer intersection-glyph regression', () => {
  // Wait for an enabled tab: the network never idles (HMR), and the server
  // render shows the tabs disabled until the core is live on the client.
  test.beforeEach(async ({ page }) => {
    await page.goto('/enterprise/dock');
    await expect(page.locator('bs-dock-manager').getByRole('tab', { name: 'Panel 1', exact: true })).toBeEnabled();
  });

  test('no intersection handle when a docked splitter and a floating-pane splitter cross-align', async ({
    page,
  }) => {
    // Docked: one vertical split (children stacked top/bottom) → 1 horizontal
    // divider running across the docked surface.
    // Floating: one horizontal split (children side-by-side) at bounds that
    // place its single vertical divider across the docked h-divider line.
    const layout = {
      root: {
        kind: 'split',
        direction: 'vertical',
        sizes: [1, 1],
        children: [
          { kind: 'stack', panes: ['panel-1'], activePane: 'panel-1' },
          { kind: 'stack', panes: ['panel-2'], activePane: 'panel-2' },
        ],
      },
      floating: [
        {
          id: 'cross-layer-float',
          bounds: { left: 100, top: 100, width: 400, height: 400 },
          root: {
            kind: 'split',
            direction: 'horizontal',
            sizes: [1, 1],
            children: [
              { kind: 'stack', panes: ['panel-3'], activePane: 'panel-3' },
              { kind: 'stack', panes: ['panel-4'], activePane: 'panel-4' },
            ],
          },
          activePane: 'panel-3',
        },
      ],
      titles: {
        'panel-1': 'Panel 1',
        'panel-2': 'Panel 2',
        'panel-3': 'Panel 3',
        'panel-4': 'Panel 4',
      },
    };

    // Neither layer contains a real same-layer intersection — the only
    // candidate pair is cross-layer, which must not produce a handle.
    expect(await countHandlesForLayout(page, layout)).toBe(0);
  });

  test('real same-layer intersection still renders alongside a cross-layer cousin', async ({
    page,
  }) => {
    // Docked has a REAL nested crossing (vertical-of-horizontal) → exactly one
    // valid handle. A floating pane adds a coincidental cross-layer alignment;
    // that phantom must be dropped but the real one kept.
    const layout = {
      root: {
        kind: 'split',
        direction: 'horizontal',
        sizes: [1, 1],
        children: [
          { kind: 'stack', panes: ['panel-1'], activePane: 'panel-1' },
          {
            kind: 'split',
            direction: 'vertical',
            sizes: [1, 1],
            children: [
              { kind: 'stack', panes: ['panel-2'], activePane: 'panel-2' },
              { kind: 'stack', panes: ['panel-3'], activePane: 'panel-3' },
            ],
          },
        ],
      },
      floating: [
        {
          id: 'phantom-float',
          bounds: { left: 50, top: 50, width: 400, height: 400 },
          root: {
            kind: 'split',
            direction: 'vertical',
            sizes: [1, 1],
            children: [
              { kind: 'stack', panes: ['panel-4'], activePane: 'panel-4' },
              { kind: 'stack', panes: ['panel-5'], activePane: 'panel-5' },
            ],
          },
          activePane: 'panel-4',
        },
      ],
      titles: {
        'panel-1': 'Panel 1',
        'panel-2': 'Panel 2',
        'panel-3': 'Panel 3',
        'panel-4': 'Panel 4',
        'panel-5': 'Panel 5',
      },
    };

    expect(await countHandlesForLayout(page, layout)).toBe(1);
  });
});
