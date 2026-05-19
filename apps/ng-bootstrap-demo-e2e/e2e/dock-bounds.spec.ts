import { test, expect } from '@playwright/test';

// PRD docs/prd/dock-floating-pane-bounds.md covers issue #347.
// These tests exercise *passive* clamping (load, ResizeObserver, intent vs
// render) — drag-time clamping is locked by unit tests on clampBoundsToHost
// (mint-dock-manager.element.spec.ts) plus integration via the gesture
// handlers themselves; we don't drive low-level pointer choreography here for
// the same reason dock.spec.ts doesn't (handlers change shape and the spec
// would be the first thing to break).

interface RectInfo {
  paneLeft: number;
  paneTop: number;
  paneRight: number;
  paneBottom: number;
  paneWidth: number;
  paneHeight: number;
  hostLeft: number;
  hostTop: number;
  hostRight: number;
  hostBottom: number;
  hostWidth: number;
  hostHeight: number;
}

async function getPaneAndHostRects(
  page: import('@playwright/test').Page,
  paneId: string,
): Promise<RectInfo | null> {
  return await page.evaluate((id) => {
    const dock = document.querySelector('mint-dock-manager') as
      | (HTMLElement & { shadowRoot: ShadowRoot | null })
      | null;
    if (!dock || !dock.shadowRoot) return null;

    const host = dock.shadowRoot.querySelector('.dock-root') as HTMLElement | null;
    if (!host) return null;

    // Floating panes are .dock-floating divs inside the shadow tree, in the
    // order the floatingLayouts array provides them. We find by aria-label.
    const panes = Array.from(
      dock.shadowRoot.querySelectorAll<HTMLElement>('.dock-floating'),
    );
    const pane = panes.find((p) => {
      const labelEl = p.querySelector<HTMLElement>('.dock-floating__title');
      return labelEl?.textContent?.trim() === id;
    });
    if (!pane) return null;

    const pr = pane.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    return {
      paneLeft: pr.left,
      paneTop: pr.top,
      paneRight: pr.right,
      paneBottom: pr.bottom,
      paneWidth: pr.width,
      paneHeight: pr.height,
      hostLeft: hr.left,
      hostTop: hr.top,
      hostRight: hr.right,
      hostBottom: hr.bottom,
      hostWidth: hr.width,
      hostHeight: hr.height,
    };
  }, paneId);
}

function expectPaneInsideHost(rects: RectInfo, tolerance = 1): void {
  expect(rects.paneLeft).toBeGreaterThanOrEqual(rects.hostLeft - tolerance);
  expect(rects.paneTop).toBeGreaterThanOrEqual(rects.hostTop - tolerance);
  expect(rects.paneRight).toBeLessThanOrEqual(rects.hostRight + tolerance);
  expect(rects.paneBottom).toBeLessThanOrEqual(rects.hostBottom + tolerance);
}

test.describe('mint-dock-manager — floating-pane bounds clamping (#347)', () => {
  test('Panel 5 stays inside the dock surface at a narrow viewport', async ({ page }) => {
    // Demo seeds Panel 5 at left:680, width:320 — right edge at x=1000.
    // Load at default viewport first to get the dock attached + rendered,
    // then shrink so the ResizeObserver re-flow pulls Panel 5 inside.
    await page.goto('/enterprise/dock');
    await page.locator('mint-dock-manager').waitFor({ state: 'attached', timeout: 15000 });
    await page.waitForTimeout(120);

    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(150);

    const rects = await getPaneAndHostRects(page, 'Panel 5');
    expect(rects).not.toBeNull();
    expectPaneInsideHost(rects!);
    // Pane should be pulled toward the host's right edge — its right is within
    // 5px of host's right (the dock surface is narrower than the seed wanted).
    expect(rects!.paneRight).toBeGreaterThan(rects!.hostRight - 5);
  });

  test('shrink-then-grow returns Panel 5 to its seeded intent', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/enterprise/dock');
    await page.locator('mint-dock-manager').waitFor({ state: 'attached', timeout: 15000 });
    // Let the initial render + intersection-handle scheduler tick settle.
    await page.waitForTimeout(120);

    const wide1 = await getPaneAndHostRects(page, 'Panel 5');
    expect(wide1).not.toBeNull();
    const seededLeftRelative = wide1!.paneLeft - wide1!.hostLeft;

    // Shrink — Panel 5 must pin to the right edge of the dock surface.
    await page.setViewportSize({ width: 800, height: 700 });
    // Allow ResizeObserver to fire and updateFloatingPanePositions to run.
    await page.waitForTimeout(120);
    const narrow = await getPaneAndHostRects(page, 'Panel 5');
    expect(narrow).not.toBeNull();
    expectPaneInsideHost(narrow!);

    // Grow back — Panel 5 must return to its seeded intent (left:680 relative to host).
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(120);
    const wide2 = await getPaneAndHostRects(page, 'Panel 5');
    expect(wide2).not.toBeNull();
    expect(wide2!.paneLeft - wide2!.hostLeft).toBeCloseTo(seededLeftRelative, 0);
  });

  test('intent is preserved across passive re-flow (out-of-bounds setter)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/enterprise/dock');
    await page.locator('mint-dock-manager').waitFor({ state: 'attached', timeout: 15000 });
    // Let the initial render + intersection-handle scheduler tick settle.
    await page.waitForTimeout(120);

    const intentPreserved = await page.evaluate(async () => {
      const dock = document.querySelector('mint-dock-manager') as
        | (HTMLElement & { layout?: unknown; shadowRoot: ShadowRoot | null })
        | null;
      if (!dock || !dock.shadowRoot) return { ok: false, reason: 'no dock' };

      // Inject a layout where the only floating pane is way out-of-bounds.
      dock.layout = {
        root: {
          kind: 'stack',
          panes: ['panel-1'],
          activePane: 'panel-1',
        },
        floating: [
          {
            id: 'out-of-bounds',
            bounds: { left: 5000, top: 5000, width: 320, height: 220 },
            root: { kind: 'stack', panes: ['ghost'], activePane: 'ghost' },
            activePane: 'ghost',
          },
        ],
        titles: { 'panel-1': 'Panel 1', ghost: 'Ghost' },
      };
      await new Promise((r) => setTimeout(r, 60));

      // Intent should still be {left:5000, top:5000} — render path clamps but
      // floating.bounds is untouched.
      const readback = (dock as unknown as { layout: { floating: { bounds: { left: number; top: number } }[] } }).layout;
      const stored = readback.floating[0]?.bounds;

      // Rendered position should be inside the host.
      const wrapper = dock.shadowRoot.querySelector<HTMLElement>('.dock-floating');
      const host = dock.shadowRoot.querySelector<HTMLElement>('.dock-root');
      if (!wrapper || !host) return { ok: false, reason: 'no wrapper/host' };
      const wr = wrapper.getBoundingClientRect();
      const hr = host.getBoundingClientRect();

      return {
        ok: true,
        storedLeft: stored?.left,
        storedTop: stored?.top,
        renderedInside:
          wr.left >= hr.left - 1 &&
          wr.top >= hr.top - 1 &&
          wr.right <= hr.right + 1 &&
          wr.bottom <= hr.bottom + 1,
      };
    });

    expect(intentPreserved.ok).toBe(true);
    expect(intentPreserved.storedLeft).toBe(5000);
    expect(intentPreserved.storedTop).toBe(5000);
    expect(intentPreserved.renderedInside).toBe(true);
  });

  test('tiny host shrinks the pane to fit (drops the 192/128 minimum)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/enterprise/dock');
    await page.locator('mint-dock-manager').waitFor({ state: 'attached', timeout: 15000 });
    // Let the initial render + intersection-handle scheduler tick settle.
    await page.waitForTimeout(120);

    // Force the dock-root itself to a tiny size via inline styles on its
    // host, then verify the floating pane shrinks to fit instead of overflowing.
    const result = await page.evaluate(async () => {
      const dock = document.querySelector('mint-dock-manager') as
        | (HTMLElement & { shadowRoot: ShadowRoot | null })
        | null;
      if (!dock || !dock.shadowRoot) return { ok: false };

      // Shrink the host element directly via style. The dock element fills
      // its parent in the demo's CSS, so constraining its CSS size is the
      // most reliable way to force a sub-min host.
      dock.style.width = '100px';
      dock.style.height = '80px';

      await new Promise((r) => setTimeout(r, 120));

      const wrapper = dock.shadowRoot.querySelector<HTMLElement>('.dock-floating');
      const host = dock.shadowRoot.querySelector<HTMLElement>('.dock-root');
      if (!wrapper || !host) return { ok: false };

      const wr = wrapper.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      return {
        ok: true,
        paneWidth: wr.width,
        paneHeight: wr.height,
        hostWidth: hr.width,
        hostHeight: hr.height,
        insideX: wr.left >= hr.left - 1 && wr.right <= hr.right + 1,
        insideY: wr.top >= hr.top - 1 && wr.bottom <= hr.bottom + 1,
      };
    });

    expect(result.ok).toBe(true);
    expect(result.paneWidth).toBeLessThanOrEqual(result.hostWidth! + 1);
    expect(result.paneHeight).toBeLessThanOrEqual(result.hostHeight! + 1);
    expect(result.insideX).toBe(true);
    expect(result.insideY).toBe(true);
  });
});
