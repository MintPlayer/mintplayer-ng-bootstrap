import { test, expect, type Page } from '@playwright/test';

/**
 * PRD scheduler-resize-glyphs — browser-level acceptance:
 *  1. touch: tap-to-select reveals the glyphs; a touch-drag that STARTS on a
 *     selected event's handle resizes immediately (no 600ms hold),
 *  2. mouse: edge-drag still resizes an UNSELECTED event (D1 regression),
 *  3. narrow header: at 320px every header control stays reachable and the
 *     title renders on one line (D9).
 */

// Every test here pays for a fresh SSR load + hydration and then drives a
// multi-step drag. Four parallel workers share one server, and Firefox
// routinely takes 2x Chromium's time under that contention (~15s vs ~6s), so
// the 30s default leaves no headroom — the assertions themselves are fast.
test.describe.configure({ timeout: 60_000 });

async function loadSampleWeek(page: Page): Promise<void> {
  await page.goto('/enterprise/scheduler');
  // Deterministic readiness rather than `waitForLoadState('networkidle')`:
  // the demo is server-rendered and then hydrates, and network quiescence
  // times out intermittently (Firefox especially) once several workers share
  // one server. The grid is in the SSR output, so its presence proves nothing
  // about hydration; data-mp-hydrated is never in server HTML — the core writes
  // it when it attaches, after which the sample-data click is handled.
  await page.waitForSelector('bs-scheduler[data-mp-hydrated]');
  await page.getByRole('button', { name: 'Load Sample Data' }).click();
  await expect
    .poll(() =>
      schedulerRoot(page).evaluate(
        (sched) => sched.querySelectorAll('.scheduler-event:not(.preview)').length,
      ),
    )
    .toBeGreaterThan(0);
}

function schedulerRoot(page: Page) {
  return page.locator('bs-scheduler');
}

/**
 * An event's committed times, read from the light DOM. Angular outputs are not
 * DOM events, so the update is observed where it lands: the demo applies it to
 * its data and the event re-renders carrying its own data-start / data-end.
 */
async function eventTimes(page: Page, title: string): Promise<{ startMs: number; endMs: number } | null> {
  return schedulerRoot(page).evaluate((sched, name) => {
    const el = Array.from(
      sched.querySelectorAll<HTMLElement>('.scheduler-event:not(.preview)[data-start]'),
    ).find((e) => (e.getAttribute('aria-label') ?? '').includes(name));
    if (!el) return null;
    return { startMs: Date.parse(el.dataset['start']!), endMs: Date.parse(el.dataset['end']!) };
  }, title);
}

test.describe('scheduler — touch resize via the selection glyph', () => {
  // Touch emulation (hasTouch + Touch constructor semantics) is only
  // dependable in Chromium — which is also the engine that represents
  // Android touch. Firefox still runs the mouse + header specs below.
  test.skip(({ browserName }) => browserName !== 'chromium', 'chromium-only touch emulation');
  test.use({ hasTouch: true });

  test('tap selects and reveals glyphs; dragging the bottom handle resizes immediately', async ({ page }) => {
    await loadSampleWeek(page);
    const original = (await eventTimes(page, 'Lunch & Learn'))!;

    const eventBtn = page.getByRole('button', { name: /Lunch & Learn/ });
    await eventBtn.scrollIntoViewIfNeeded();
    await eventBtn.tap();

    // Selection revealed the glyphs (visible, aria-hidden decorative).
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate((sched) => {
          const sel = sched.querySelector('.scheduler-event.selected');
          const glyph = sel?.querySelector('.resize-handle.bottom .resize-glyph');
          return {
            selected: !!sel,
            glyphVisible: glyph ? getComputedStyle(glyph).visibility === 'visible' : false,
            glyphAriaHidden: glyph?.getAttribute('aria-hidden') ?? null,
          };
        }),
      )
      .toEqual({ selected: true, glyphVisible: true, glyphAriaHidden: 'true' });

    // The handle, centred in the viewport and settled: the app's global
    // `scroll-behavior: smooth` animates scrollIntoView for several frames, and
    // coordinates read mid-animation drift away from the handle.
    const handle = page.locator('bs-scheduler .scheduler-event.selected .resize-handle.bottom');
    await handle.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // Touch-drag the bottom handle UP. It must resize IMMEDIATELY — no 600ms
    // hold — so the moves follow the press without waiting. Resize snaps to
    // 30-min (40px) slots and the handle can start anywhere within its band, so
    // 140px guarantees crossing at least one boundary.
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', dy: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y: y - dy, id: 1 }],
      });
    await touch('touchStart', 0);
    for (const dy of [40, 80, 110, 140]) {
      await touch('touchMove', dy);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    }
    await touch('touchEnd', 140);

    // Lunch & Learn is 12:00–13:00 (1h; the product's minDurationMs floor is
    // 30min). Dragging the bottom handle up must strictly shrink it, snapped
    // to a 30-min slot boundary.
    await expect
      .poll(async () => {
        const now = await eventTimes(page, 'Lunch & Learn');
        return now ? now.endMs - now.startMs : null;
      })
      .toBeLessThan(original.endMs - original.startMs);
    const u = (await eventTimes(page, 'Lunch & Learn'))!;
    const durationMs = u.endMs - u.startMs;
    expect(u.startMs).toBe(original.startMs);
    expect(durationMs).toBeGreaterThanOrEqual(30 * 60 * 1000);
    expect(durationMs % (30 * 60 * 1000)).toBe(0);
  });
});

test.describe('scheduler — mouse edge-drag still resizes an UNSELECTED event (D1)', () => {
  test('dragging the bottom edge strip without selecting first commits a shorter event', async ({ page }) => {
    await loadSampleWeek(page);

    const eventBtn = page.getByRole('button', { name: /Lunch & Learn/ });
    await eventBtn.scrollIntoViewIfNeeded();
    const box = (await eventBtn.boundingBox())!;

    const wasSelected = await schedulerRoot(page).evaluate(
      (sched) => !!sched.querySelector('.scheduler-event.selected'),
    );
    expect(wasSelected).toBe(false);

    // Grab 3px above the bottom edge (inside the 8px strip) and drag UP.
    const x = box.x + box.width / 2;
    const y = box.y + box.height - 3;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) {
      await page.mouse.move(x, y - i * 12);
      await page.waitForTimeout(60);
    }
    await page.mouse.up();

    // The demo applied the update and the event re-rendered at its new length.
    await expect
      .poll(async () => {
        const u = await eventTimes(page, 'Lunch & Learn');
        return u ? u.endMs - u.startMs : null;
      })
      .toBe(30 * 60 * 1000);
  });
});

/**
 * The drag ghost must paint OVER the event it came from — in every selection
 * state. Regression guard: `.scheduler-event.selected` carries a z-index (so
 * its straddling resize handles win pointer hits), and the ghost originally
 * declared none, so it silently vanished behind a selected event mid-resize.
 * The unselected case masked it, because equal z-indexes fall back to DOM
 * order and the ghost is appended last.
 *
 * Note the existing resize tests above cannot catch this: they only observe
 * the committed times, and the touch one even selects first — it drove
 * the broken visual state and still passed.
 */
test.describe('scheduler — the drag ghost stays above its source event', () => {
  for (const selectFirst of [false, true]) {
    test(`ghost paints over the ${selectFirst ? 'SELECTED' : 'unselected'} source event`, async ({ page }) => {
      await loadSampleWeek(page);

      const eventBtn = page.getByRole('button', { name: /Lunch & Learn/ });
      await eventBtn.scrollIntoViewIfNeeded();
      if (selectFirst) {
        await eventBtn.click();
        await expect
          .poll(() =>
            schedulerRoot(page).evaluate(
              (sched) => !!sched.querySelector('.scheduler-event.selected'),
            ),
          )
          .toBe(true);
      }

      const box = (await eventBtn.boundingBox())!;
      const x = box.x + box.width / 2;
      const y = box.y + box.height - 3;
      await page.mouse.move(x, y);
      await page.mouse.down();
      // Drag DOWN so the ghost grows past the event and the two overlap.
      for (let i = 1; i <= 4; i++) {
        await page.mouse.move(x, y + i * 20);
        await page.waitForTimeout(60);
      }

      // Probe WHILE dragging — the ghost only exists while previewEvent is set.
      const probe = await schedulerRoot(page).evaluate((sched) => {
        const root = sched;
        const preview = root.querySelector<HTMLElement>('.scheduler-event.preview');
        // Resolve the real source by accessible name; a bare
        // `.scheduler-event` would match some other day's event.
        const src = Array.from(
          root.querySelectorAll<HTMLElement>('.scheduler-event:not(.preview)'),
        ).find((el) => (el.getAttribute('aria-label') ?? '').includes('Lunch & Learn'));
        if (!preview || !src) return { ok: false as const, hasPreview: !!preview, hasSrc: !!src };

        const p = preview.getBoundingClientRect();
        const s = src.getBoundingClientRect();
        const overlapW = Math.min(p.right, s.right) - Math.max(p.left, s.left);
        const overlapH = Math.min(p.bottom, s.bottom) - Math.max(p.top, s.top);
        const cx = (Math.max(p.left, s.left) + Math.min(p.right, s.right)) / 2;
        const cy = (Math.max(p.top, s.top) + Math.min(p.bottom, s.bottom)) / 2;

        // The ghost is `pointer-events: none` by design, and hit-testing skips
        // such elements — so re-enable it for the probe only. pointer-events
        // takes no part in the stacking algorithm, so the order reported here
        // is exactly the paint order.
        const saved = preview.style.pointerEvents;
        preview.style.pointerEvents = 'auto';
        const stack = document.elementsFromPoint(cx, cy);
        preview.style.pointerEvents = saved;

        return {
          ok: true as const,
          siblings: preview.parentElement === src.parentElement,
          overlapW,
          overlapH,
          previewIndex: stack.findIndex((el) => el === preview || preview.contains(el)),
          sourceIndex: stack.findIndex((el) => el === src || src.contains(el)),
        };
      });
      await page.mouse.up();

      expect(probe.ok).toBe(true);
      if (!probe.ok) return;
      // z-index only orders elements within one stacking context — assert the
      // premise, so re-parenting the ghost can't quietly void this test.
      expect(probe.siblings).toBe(true);
      // A real overlap must exist, or "on top" is vacuous.
      expect(probe.overlapW).toBeGreaterThan(10);
      expect(probe.overlapH).toBeGreaterThan(10);
      // elementsFromPoint is topmost-first.
      expect(probe.previewIndex).toBeGreaterThanOrEqual(0);
      expect(probe.previewIndex).toBeLessThan(probe.sourceIndex);
    });
  }
});

test.describe('scheduler — narrow header keeps every control reachable (D9)', () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test('at 320px the title is one line and all header buttons are clickable', async ({ page }) => {
    await page.goto('/enterprise/scheduler');
    // Same deterministic readiness as loadSampleWeek (see there); this test
    // needs no sample data, only the rendered header.
    // data-narrow comes from the core's own measurement of the hydrated grid.
    await page.waitForSelector('bs-scheduler[data-mp-hydrated] .scheduler-header[data-narrow]');

    const state = await schedulerRoot(page).evaluate((sched) => {
      const root = sched;
      const header = root.querySelector('.scheduler-header')!;
      const title = root.querySelector('.scheduler-title')!;
      const vw = document.documentElement.clientWidth;
      return {
        narrow: header.hasAttribute('data-narrow'),
        titleSingleLine: title.getBoundingClientRect().height < 32,
        buttonsInViewport: [...header.querySelectorAll('button')].every((b) => {
          const r = b.getBoundingClientRect();
          return r.left >= 0 && r.right <= vw;
        }),
      };
    });
    expect(state.narrow).toBe(true);
    expect(state.titleSingleLine).toBe(true);
    expect(state.buttonsInViewport).toBe(true);

    // The strongest reachability assertion: Playwright refuses clicks on
    // covered or out-of-viewport targets — click every header control.
    for (const name of ['Previous period', 'Next period', 'Jump to today', 'Year', 'Month', 'Week', 'Day', 'Timeline']) {
      await page.getByRole('button', { name, exact: true }).click();
    }
    // Still on one line after cycling all views.
    const titleOk = await schedulerRoot(page).evaluate(
      (sched) => sched.querySelector('.scheduler-title')!.getBoundingClientRect().height < 32,
    );
    expect(titleOk).toBe(true);
  });
});
