import { test, expect, Page } from '@playwright/test';

// PRD docs/prd/dock-floating-pane-bounds.md covers issue #347.
// These tests exercise *passive* clamping (load, ResizeObserver, intent vs
// render) — drag-time clamping is locked by unit tests on clampBoundsToHost
// (ui-core dock/src/core/geometry.spec.ts); we don't drive low-level pointer
// choreography here for the same reason dock.spec.ts doesn't.
//
// The dock renders in the light DOM (#437) and its host element IS the dock
// surface, so the floating windows are measured against bs-dock-manager.

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

const dock = (page: Page) => page.locator('bs-dock-manager');

/** The floating window titled `title`, measured against the dock surface. */
async function getPaneAndHostRects(page: Page, title: string): Promise<RectInfo | null> {
  return await page.evaluate((id) => {
    const host = document.querySelector<HTMLElement>('bs-dock-manager');
    const pane = Array.from(host?.querySelectorAll<HTMLElement>('.dock-floating') ?? []).find(
      (p) => p.querySelector('.dock-floating__title')?.textContent?.trim() === id,
    );
    if (!host || !pane) return null;
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
  }, title);
}

function expectPaneInsideHost(rects: RectInfo, tolerance = 1): void {
  expect(rects.paneLeft).toBeGreaterThanOrEqual(rects.hostLeft - tolerance);
  expect(rects.paneTop).toBeGreaterThanOrEqual(rects.hostTop - tolerance);
  expect(rects.paneRight).toBeLessThanOrEqual(rects.hostRight + tolerance);
  expect(rects.paneBottom).toBeLessThanOrEqual(rects.hostBottom + tolerance);
}

/** Loads the demo and waits until the core is live (tabs enable on the client). */
async function gotoDock(page: Page): Promise<void> {
  await page.goto('/enterprise/dock');
  await expect(dock(page).getByRole('tab', { name: 'Panel 5', exact: true })).toBeEnabled({ timeout: 15_000 });
}

/** Reads a JSON snippet section of the demo ("Live layout" / "Captured snapshot"). */
async function readSnapshot(page: Page, heading: string): Promise<string> {
  return await page.evaluate((title) => {
    const section = Array.from(document.querySelectorAll('.dock-demo__snapshot')).find(
      (d) => d.querySelector('.dock-demo__snapshot-title')?.textContent?.includes(title),
    );
    const rows = section?.querySelectorAll('bs-code-snippet .line-text') ?? [];
    return Array.from(rows, (row) => row.textContent ?? '').join('\n');
  }, heading);
}

test.describe('bs-dock-manager — floating-pane bounds clamping (#347)', () => {
  // Firefox cold-starts the prod dev server slowly on CI runners; default 30s
  // test timeout can race the goto + first-paint. 60s gives headroom without
  // masking real hangs.
  test.describe.configure({ timeout: 60_000 });

  test('Panel 5 stays inside the dock surface at a narrow viewport', async ({ page }) => {
    // Demo seeds Panel 5 at left:680, width:320 — right edge at x=1000.
    // Load at default viewport first so the dock attaches + renders, then
    // shrink so the ResizeObserver re-flow pulls Panel 5 inside.
    await gotoDock(page);
    await page.setViewportSize({ width: 900, height: 700 });

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
    // Pulled toward the host's right edge — the surface is narrower than the seed wanted.
    expect(rects!.paneRight).toBeGreaterThan(rects!.hostRight - 5);
  });

  test('shrink-then-grow returns Panel 5 to its seeded intent', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoDock(page);

    const wide1 = await getPaneAndHostRects(page, 'Panel 5');
    expect(wide1).not.toBeNull();
    const seededLeftRelative = wide1!.paneLeft - wide1!.hostLeft;

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
  });

  test('intent is preserved across passive re-flow (out-of-bounds layout)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoDock(page);

    // Restore a layout whose only floating pane is far out of bounds.
    await page.getByLabel('Layout JSON').fill(
      JSON.stringify({
        root: { kind: 'stack', panes: ['panel-1'], activePane: 'panel-1' },
        floating: [
          {
            id: 'out-of-bounds',
            bounds: { left: 5000, top: 5000, width: 320, height: 220 },
            root: { kind: 'stack', panes: ['ghost'], activePane: 'ghost' },
            activePane: 'ghost',
          },
        ],
        titles: { 'panel-1': 'Panel 1', ghost: 'Ghost' },
      }),
    );
    await page.getByRole('button', { name: 'Apply layout JSON' }).click();

    // The render clamps the window inside the surface...
    await expect
      .poll(
        async () => {
          const r = await getPaneAndHostRects(page, 'Ghost');
          return (
            !!r &&
            r.paneLeft >= r.hostLeft - 1 &&
            r.paneTop >= r.hostTop - 1 &&
            r.paneRight <= r.hostRight + 1 &&
            r.paneBottom <= r.hostBottom + 1
          );
        },
        { timeout: 10_000 },
      )
      .toBeTruthy();

    // ...but the layout keeps the intent untouched.
    await page.getByRole('button', { name: 'Capture layout JSON' }).click();
    await expect.poll(() => readSnapshot(page, 'Captured snapshot')).toContain('"left": 5000');
    expect(await readSnapshot(page, 'Captured snapshot')).toContain('"top": 5000');
  });

  test('tiny host shrinks the pane to fit (drops the 192/128 minimum)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoDock(page);
    await expect(dock(page).locator('.dock-floating').first()).toBeVisible();

    // Force the dock surface to a tiny size; the ResizeObserver re-clamps.
    await dock(page).evaluate((el: HTMLElement) => {
      el.style.width = '100px';
      el.style.height = '80px';
      el.style.minHeight = '0';
    });

    await expect
      .poll(
        async () => {
          const r = await getPaneAndHostRects(page, 'Panel 5');
          return !!r && r.paneWidth <= 110;
        },
        { timeout: 10_000 },
      )
      .toBeTruthy();

    const rects = await getPaneAndHostRects(page, 'Panel 5');
    expect(rects).not.toBeNull();
    expect(rects!.paneWidth).toBeLessThanOrEqual(rects!.hostWidth + 1);
    expect(rects!.paneHeight).toBeLessThanOrEqual(rects!.hostHeight + 1);
    expectPaneInsideHost(rects!);
  });
});
