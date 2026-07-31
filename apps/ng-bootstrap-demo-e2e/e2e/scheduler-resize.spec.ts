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
  // one dev/prod server. Waiting for the custom element to be UPGRADED and
  // its grid rendered proves the bundle ran and Angular handed the element
  // its inputs — which is what the old wait was really approximating.
  await page.waitForSelector('mp-scheduler');
  await page.waitForFunction(
    () =>
      !!customElements.get('mp-scheduler') &&
      !!document
        .querySelector('mp-scheduler')
        ?.shadowRoot?.querySelector('[role="grid"]'),
  );
  await page.getByRole('button', { name: 'Load Sample Data' }).click();
  // Confirm the click actually took effect instead of assuming a fixed delay
  // was enough — a click that lands pre-hydration is silently dropped.
  await expect
    .poll(() =>
      schedulerRoot(page).evaluate(
        (sched) =>
          sched.shadowRoot!.querySelectorAll('.scheduler-event:not(.preview)').length,
      ),
    )
    .toBeGreaterThan(0);
}

function schedulerRoot(page: Page) {
  return page.locator('mp-scheduler');
}

/** Collect event-update details emitted by the WC. */
async function captureUpdates(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __updates: { title: string; startMs: number; endMs: number }[] };
    w.__updates = [];
    document.querySelector('mp-scheduler')!.addEventListener('event-update', (e) => {
      const detail = (e as CustomEvent<{ event: { title: string; start: Date; end: Date } }>).detail;
      w.__updates.push({
        title: detail.event.title,
        startMs: detail.event.start.getTime(),
        endMs: detail.event.end.getTime(),
      });
    });
  });
}

async function readUpdates(page: Page): Promise<{ title: string; startMs: number; endMs: number }[]> {
  return page.evaluate(() => (window as unknown as { __updates: [] }).__updates);
}

test.describe('scheduler — touch resize via the selection glyph', () => {
  // Touch emulation (hasTouch + Touch constructor semantics) is only
  // dependable in Chromium — which is also the engine that represents
  // Android touch. Firefox still runs the mouse + header specs below.
  test.skip(({ browserName }) => browserName !== 'chromium', 'chromium-only touch emulation');
  test.use({ hasTouch: true });

  test('tap selects and reveals glyphs; dragging the bottom handle resizes immediately', async ({ page }) => {
    await loadSampleWeek(page);
    await captureUpdates(page);

    const eventBtn = page.getByRole('button', { name: /Lunch & Learn/ });
    await eventBtn.scrollIntoViewIfNeeded();
    await eventBtn.tap();
    await page.waitForTimeout(300);

    // Selection revealed the glyphs (visible, aria-hidden decorative).
    const glyphState = await schedulerRoot(page).evaluate((sched) => {
      const sel = sched.shadowRoot!.querySelector('.scheduler-event.selected');
      const glyph = sel?.querySelector('.resize-handle.bottom .resize-glyph');
      return {
        selected: !!sel,
        glyphVisible: glyph ? getComputedStyle(glyph).visibility === 'visible' : false,
        glyphAriaHidden: glyph?.getAttribute('aria-hidden') ?? null,
      };
    });
    expect(glyphState.selected).toBe(true);
    expect(glyphState.glyphVisible).toBe(true);
    expect(glyphState.glyphAriaHidden).toBe('true');

    // Touch-drag the bottom handle UP one slot (shrink — stays in-viewport).
    // Synthetic TouchEvents drive the same listeners as real touches and
    // work in every engine (no CDP). The drag must resize IMMEDIATELY —
    // no 600ms hold — so no waiting between start and first move.
    await schedulerRoot(page).evaluate(async (sched) => {
      const root = sched.shadowRoot!;
      const handle = root.querySelector('.scheduler-event.selected .resize-handle.bottom') as HTMLElement;
      const raf = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
      handle.scrollIntoView({ block: 'center' });
      // The app's global stylesheet sets `scroll-behavior: smooth` on the
      // page, so scrollIntoView animates for several frames. Real touch
      // input cancels an in-flight smooth scroll on contact; synthetic
      // TouchEvents don't, so wait out the animation first — otherwise the
      // clientY coordinates below drift away from the handle mid-drag.
      let lastY = window.scrollY;
      for (let stableFrames = 0; stableFrames < 5; ) {
        await raf();
        stableFrames = window.scrollY === lastY ? stableFrames + 1 : 0;
        lastY = window.scrollY;
      }
      const center = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      };
      const touch = (type: string, target: EventTarget, clientX: number, clientY: number) => {
        const t = new Touch({ identifier: 1, target: target as Element, clientX, clientY });
        target.dispatchEvent(new TouchEvent(type, {
          touches: type === 'touchend' ? [] : [t],
          changedTouches: [t],
          targetTouches: type === 'touchend' ? [] : [t],
          bubbles: true,
          composed: true,
          cancelable: true,
        }));
      };
      const start = center(handle);
      touch('touchstart', handle, start.x, start.y);
      await raf();
      // Drag activation applies scroll-blocking, which can shift the page —
      // re-derive the handle position from the CURRENT DOM (the drag start
      // also re-rendered the events) so the moves aim where the handle
      // actually is now. Real fingers self-correct visually; a script must
      // do it explicitly. Events keep going to the original node: the input
      // handler attaches its listeners to the touched element on touchstart.
      const now = center(root.querySelector('.scheduler-event.selected .resize-handle.bottom')!);
      // Resize snaps to 30-min (40px) slot boundaries, and the handle can
      // start anywhere within its slot's 40px band — a move smaller than
      // one full slot can legitimately land back in the same slot (that's
      // correct snapping, not a bug). 140px guarantees crossing at least
      // one boundary regardless of the handle's exact starting offset.
      for (const dy of [40, 80, 110, 140]) {
        touch('touchmove', handle, now.x, now.y - dy);
        await raf();
        await raf();
      }
      touch('touchend', handle, now.x, now.y - 140);
    });
    await page.waitForTimeout(300);

    const updates = await readUpdates(page);
    expect(updates.length).toBeGreaterThan(0);
    const u = updates[updates.length - 1];
    expect(u.title).toBe('Lunch & Learn');
    // Lunch & Learn is 12:00–13:00 (1h, the product's minDurationMs floor is
    // 30min). Dragging the bottom handle up must strictly shrink it, snapped
    // to a 30-min slot boundary.
    const originalDurationMs = 60 * 60 * 1000;
    const durationMs = u.endMs - u.startMs;
    expect(durationMs).toBeGreaterThanOrEqual(30 * 60 * 1000);
    expect(durationMs).toBeLessThan(originalDurationMs);
    expect(durationMs % (30 * 60 * 1000)).toBe(0);
  });
});

test.describe('scheduler — mouse edge-drag still resizes an UNSELECTED event (D1)', () => {
  test('dragging the bottom edge strip without selecting first emits event-update', async ({ page }) => {
    await loadSampleWeek(page);
    await captureUpdates(page);

    const eventBtn = page.getByRole('button', { name: /Lunch & Learn/ });
    await eventBtn.scrollIntoViewIfNeeded();
    const box = (await eventBtn.boundingBox())!;

    const wasSelected = await schedulerRoot(page).evaluate(
      (sched) => !!sched.shadowRoot!.querySelector('.scheduler-event.selected'),
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
    await page.waitForTimeout(300);

    const updates = await readUpdates(page);
    expect(updates.length).toBeGreaterThan(0);
    const u = updates[updates.length - 1];
    expect(u.title).toBe('Lunch & Learn');
    expect(u.endMs - u.startMs).toBe(30 * 60 * 1000);
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
 * the `event-update` payload, and the touch one even selects first — it drove
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
              (sched) => !!sched.shadowRoot!.querySelector('.scheduler-event.selected'),
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
        const root = sched.shadowRoot!;
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
        const stack = root.elementsFromPoint(cx, cy);
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
    await page.waitForSelector('mp-scheduler');
    await page.waitForFunction(
      () =>
        !!customElements.get('mp-scheduler') &&
        !!document
          .querySelector('mp-scheduler')
          ?.shadowRoot?.querySelector('.scheduler-header[data-narrow]'),
    );

    const state = await schedulerRoot(page).evaluate((sched) => {
      const root = sched.shadowRoot!;
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
      (sched) => sched.shadowRoot!.querySelector('.scheduler-title')!.getBoundingClientRect().height < 32,
    );
    expect(titleOk).toBe(true);
  });
});
