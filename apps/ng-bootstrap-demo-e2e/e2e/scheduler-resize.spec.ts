import { test, expect, type Page } from '@playwright/test';

/**
 * PRD scheduler-resize-glyphs — browser-level acceptance:
 *  1. touch: tap-to-select reveals the glyphs; a touch-drag that STARTS on a
 *     selected event's handle resizes immediately (no 600ms hold),
 *  2. mouse: edge-drag still resizes an UNSELECTED event (D1 regression),
 *  3. narrow header: at 320px every header control stays reachable and the
 *     title renders on one line (D9).
 */

async function loadSampleWeek(page: Page): Promise<void> {
  await page.goto('/enterprise/scheduler');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Load Sample Data' }).click();
  await page.waitForTimeout(200);
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
      handle.scrollIntoView({ block: 'center' });
      const r = handle.getBoundingClientRect();
      const x = r.left + r.width / 2;
      let y = r.top + r.height / 2;
      const touch = (type: string, target: EventTarget, clientY: number) => {
        const t = new Touch({ identifier: 1, target: target as Element, clientX: x, clientY });
        target.dispatchEvent(new TouchEvent(type, {
          touches: type === 'touchend' ? [] : [t],
          changedTouches: [t],
          targetTouches: type === 'touchend' ? [] : [t],
          bubbles: true,
          composed: true,
          cancelable: true,
        }));
      };
      touch('touchstart', handle, y);
      const raf = () => new Promise((res) => requestAnimationFrame(res));
      const steps = [10, 20, 30, 40];
      for (const dy of steps) {
        touch('touchmove', handle, y - dy);
        await raf();
        await raf();
      }
      touch('touchend', handle, y - 40);
    });
    await page.waitForTimeout(300);

    const updates = await readUpdates(page);
    expect(updates.length).toBeGreaterThan(0);
    const u = updates[updates.length - 1];
    expect(u.title).toBe('Lunch & Learn');
    // Lunch & Learn is 12:00–13:00; shrinking by one 30-min slot → ends 12:30.
    expect(u.endMs - u.startMs).toBe(30 * 60 * 1000);
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

test.describe('scheduler — narrow header keeps every control reachable (D9)', () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test('at 320px the title is one line and all header buttons are clickable', async ({ page }) => {
    await page.goto('/enterprise/scheduler');
    await page.waitForLoadState('networkidle');

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
