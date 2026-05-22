import { test, expect } from '@playwright/test';
// Injects a layout straight onto the <mint-dock-manager> element via its
// `layout` property setter — Angular only writes that property once on mount,
// so writes made afterwards stick. Returns the count of intersection handles
// the renderer ends up emitting after the scheduler debounce settles.
async function countHandlesForLayout(
  page: import('@playwright/test').Page,
  layout: unknown,
): Promise<number> {
  return await page.evaluate(async (l) => {
    const el = document.querySelector('mint-dock-manager') as
      | (HTMLElement & { layout?: unknown })
      | null;
    if (!el || !el.shadowRoot) return -1;

    el.layout = l;

    // setTimeout(5) debounce in scheduleRenderIntersectionHandles() — wait
    // past it twice so observers triggered by the layout swap also flush.
    await new Promise((r) => setTimeout(r, 60));

    return el.shadowRoot.querySelectorAll('.dock-intersection-handle').length;
  }, layout);
}

test.describe('mint-dock-manager — cross-layer intersection-glyph regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enterprise/dock');
    await page.waitForLoadState('networkidle');
  });

  test('no intersection handle when a docked splitter and a floating-pane splitter cross-align', async ({
    page,
  }) => {
    // Docked: one vertical split (children stacked top/bottom) → 1 horizontal
    // divider running across the docked surface at ~y=300.
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

    const count = await countHandlesForLayout(page, layout);
    // Pre-fix: 1 phantom handle at the cross-layer coincidence. Post-fix: 0,
    // because neither the docked layer nor the float contains a real same-
    // layer intersection — the only candidate pair was cross-layer.
    expect(count).toBe(0);
  });

  test('real same-layer intersection still renders alongside a cross-layer cousin', async ({
    page,
  }) => {
    // Docked has a REAL nested crossing (vertical-of-horizontal) → exactly one
    // valid handle. A floating pane adds a coincidental cross-layer alignment;
    // the fix must drop that phantom but keep the real one.
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

    const count = await countHandlesForLayout(page, layout);
    // Exactly one handle — the real docked-layer crossing of the outer
    // horizontal split with its inner vertical split. Any phantoms between
    // the float's divider and the docked dividers must be filtered out.
    expect(count).toBe(1);
  });
});
