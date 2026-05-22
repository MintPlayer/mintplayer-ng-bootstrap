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
  return await page.evaluate(async (id) => {
    // Poll for the pane to appear — first-paint can race with the WC's render
    // and Firefox in particular is slow on cold-start in CI.
    for (let i = 0; i < 40; i++) {
      const dock = document.querySelector('mint-dock-manager') as
        | (HTMLElement & { shadowRoot: ShadowRoot | null })
        | null;
      if (dock?.shadowRoot) {
        const panes = Array.from(dock.shadowRoot.querySelectorAll<HTMLElement>('.dock-floating'));
        const hit = panes.find((p) => {
          const labelEl = p.querySelector<HTMLElement>('.dock-floating__title');
          return labelEl?.textContent?.trim() === id;
        });
        if (hit) break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    const dock = document.querySelector('mint-dock-manager') as
      | (HTMLElement & { shadowRoot: ShadowRoot | null })
      | null;
    if (!dock || !dock.shadowRoot) return null;

    const host = dock.shadowRoot.querySelector('.dock-root') as HTMLElement | null;
    if (!host) return null;

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
  // Firefox cold-starts the prod dev server slowly on CI runners; default 30s
  // test timeout can race the goto + first-paint. 60s gives headroom without
  // masking real hangs.
  test.describe.configure({ timeout: 60_000 });

  test('Panel 5 stays inside the dock surface at a narrow viewport', async ({ page }) => {
    // Demo seeds Panel 5 at left:680, width:320 — right edge at x=1000.
    // Load at default viewport first so the dock attaches + renders, then
    // shrink so the ResizeObserver re-flow pulls Panel 5 inside.
    await page.goto('/enterprise/dock');
    await page.locator('mint-dock-manager').waitFor({ state: 'attached', timeout: 15000 });

    await page.setViewportSize({ width: 900, height: 700 });

    // Poll on the actual invariant: pane right edge inside host right edge.
    // Replaces a fixed waitForTimeout that raced ResizeObserver on slow CI.
    await expect
      .poll(
        async () => {
          const r = await getPaneAndHostRects(page, 'Panel 5');
          return !!r && r.paneRight <= r.hostRight + 1;
        },
        { timeout: 10_000 },
      )
      .toBeTruthy();

    const rects = await getPaneAndHostRects(page, 'Panel 5');
    expect(rects).not.toBeNull();
    expectPaneInsideHost(rects!);
    // Pane should be pulled toward the host's right edge — within 5px (the
    // dock surface is narrower than the seed wanted).
    expect(rects!.paneRight).toBeGreaterThan(rects!.hostRight - 5);
  });

  test('shrink-then-grow returns Panel 5 to its seeded intent', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/enterprise/dock');
    await page.locator('mint-dock-manager').waitFor({ state: 'attached', timeout: 15000 });

    const wide1 = await getPaneAndHostRects(page, 'Panel 5');
    expect(wide1).not.toBeNull();
    const seededLeftRelative = wide1!.paneLeft - wide1!.hostLeft;

    // Shrink — poll until Panel 5 has actually been pulled inside the new host.
    await page.setViewportSize({ width: 800, height: 700 });
    await expect
      .poll(
        async () => {
          const r = await getPaneAndHostRects(page, 'Panel 5');
          return !!r && r.paneRight <= r.hostRight + 1;
        },
        { timeout: 10_000 },
      )
      .toBeTruthy();
    const narrow = await getPaneAndHostRects(page, 'Panel 5');
    expect(narrow).not.toBeNull();
    expectPaneInsideHost(narrow!);

    // Grow back — poll until Panel 5 has returned to its seeded intent.
    await page.setViewportSize({ width: 1400, height: 900 });
    await expect
      .poll(
        async () => {
          const r = await getPaneAndHostRects(page, 'Panel 5');
          return !!r && Math.abs(r.paneLeft - r.hostLeft - seededLeftRelative) <= 1;
        },
        { timeout: 10_000 },
      )
      .toBeTruthy();
    const wide2 = await getPaneAndHostRects(page, 'Panel 5');
    expect(wide2).not.toBeNull();
    expect(wide2!.paneLeft - wide2!.hostLeft).toBeCloseTo(seededLeftRelative, 0);
  });

  test('intent is preserved across passive re-flow (out-of-bounds setter)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/enterprise/dock');
    await page.locator('mint-dock-manager').waitFor({ state: 'attached', timeout: 15000 });

    const intentPreserved = await page.evaluate(async () => {
      // Wait for the shadow root to populate before writing layout.
      for (let i = 0; i < 30; i++) {
        const d = document.querySelector('mint-dock-manager') as
          | (HTMLElement & { shadowRoot: ShadowRoot | null })
          | null;
        if (d?.shadowRoot?.querySelector('.dock-root')) break;
        await new Promise((r) => setTimeout(r, 100));
      }

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

      // Poll until the wrapper has rendered and the clamp has applied.
      for (let i = 0; i < 30; i++) {
        const w = dock.shadowRoot.querySelector<HTMLElement>('.dock-floating');
        const h = dock.shadowRoot.querySelector<HTMLElement>('.dock-root');
        if (w && h) {
          const wr = w.getBoundingClientRect();
          const hr = h.getBoundingClientRect();
          if (wr.right <= hr.right + 1 && wr.bottom <= hr.bottom + 1) break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      // Intent should still be {left:5000, top:5000} — render path clamps but
      // floating.bounds is untouched.
      const readback = (dock as unknown as { layout: { floating: { bounds: { left: number; top: number } }[] } }).layout;
      const stored = readback.floating[0]?.bounds;

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

    // Force the dock-root to a tiny size via inline styles on the host,
    // then poll until the wrapper has actually shrunk (ResizeObserver +
    // render is async; a fixed wait is flaky on slow CI runners).
    const result = await page.evaluate(async () => {
      const dock = document.querySelector('mint-dock-manager') as
        | (HTMLElement & { shadowRoot: ShadowRoot | null })
        | null;
      if (!dock || !dock.shadowRoot) return { ok: false, reason: 'no dock or shadow root' };

      // Wait for the floating pane to be in the shadow DOM. First-paint can
      // race with the WC's initial render on a slow CI runner.
      for (let i = 0; i < 30; i++) {
        if (dock.shadowRoot.querySelector('.dock-floating')) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!dock.shadowRoot.querySelector('.dock-floating')) {
        return { ok: false, reason: 'no .dock-floating after 3s' };
      }

      dock.style.width = '100px';
      dock.style.height = '80px';

      // Poll until the wrapper actually reflects the smaller host. Host is
      // 100px; wrapper must end up <= 110px (10px slack for borders + flake).
      for (let i = 0; i < 30; i++) {
        const w = dock.shadowRoot.querySelector<HTMLElement>('.dock-floating');
        if (w && w.getBoundingClientRect().width <= 110) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      const wrapper = dock.shadowRoot.querySelector<HTMLElement>('.dock-floating');
      const host = dock.shadowRoot.querySelector<HTMLElement>('.dock-root');
      if (!wrapper || !host) {
        return { ok: false, reason: 'wrapper or host gone after shrink' };
      }

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

    expect(result.ok, (result as { reason?: string }).reason ?? 'no reason').toBe(true);
    expect(result.paneWidth).toBeLessThanOrEqual(result.hostWidth! + 1);
    expect(result.paneHeight).toBeLessThanOrEqual(result.hostHeight! + 1);
    expect(result.insideX).toBe(true);
    expect(result.insideY).toBe(true);
  });
});
