import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * PRD scheduler-view-mode-completeness — browser-level acceptance for the parts
 * that only a real engine can prove:
 *  1. a multi-day create-drag draws one ghost box PER COLUMN (R1),
 *  2. the timeline scrolls on both axes with the resource column staying
 *     pinned (R5) — layout the unit suite cannot measure,
 *  3. the opt-in resource affordances appear and actually add a row (R3/R7),
 *  4. the month day popover opens, traps nothing, and returns focus (R6).
 *
 * These are the first browser tests to touch the timeline view at all.
 */

// Same budget as scheduler-resize.spec.ts and for the same reason: each test
// pays for a full SSR load + hydration before it does anything, and Firefox
// under shared workers routinely takes 2x Chromium.
test.describe.configure({ timeout: 60_000 });

function schedulerRoot(page: Page): Locator {
  return page.locator('mp-scheduler');
}

async function loadSampleWeek(page: Page): Promise<void> {
  await page.goto('/enterprise/scheduler');
  // Deterministic readiness, not `networkidle` — see scheduler-resize.spec.ts.
  await page.waitForSelector('mp-scheduler');
  await page.waitForFunction(
    () =>
      !!customElements.get('mp-scheduler') &&
      !!document.querySelector('mp-scheduler')?.shadowRoot?.querySelector('[role="grid"]'),
  );
  await page.getByRole('button', { name: 'Load Sample Data' }).click();
  await expect
    .poll(() =>
      schedulerRoot(page).evaluate(
        (sched) => sched.shadowRoot!.querySelectorAll('.scheduler-event:not(.preview)').length,
      ),
    )
    .toBeGreaterThan(0);
}

/** Switch view through the component's OWN switcher, as a user would. */
async function switchView(page: Page, view: string): Promise<void> {
  await schedulerRoot(page).evaluate((sched, v) => {
    sched
      .shadowRoot!.querySelector<HTMLElement>(`.scheduler-view-switcher button[data-view="${v}"]`)!
      .click();
  }, view);
  await expect
    .poll(() =>
      schedulerRoot(page).evaluate(
        (sched, v) =>
          !!sched.shadowRoot!.querySelector(
            `.scheduler-view-switcher button[data-view="${v}"][aria-pressed="true"]`,
          ),
        view,
      ),
    )
    .toBe(true);
}

/**
 * axe over the CURRENT state.
 *
 * The shared axe gate (`playwright.a11y.config.ts`) audits load + one
 * interaction, which for this page means the default state: permissions off and
 * the popover closed — i.e. none of the UI added here. These two states have to
 * be audited where they are reachable, which is this spec.
 *
 * Same rule exclusions as the gate, for the same documented reasons: contrast is
 * covered by the visual specs, and axe cannot resolve IDREFs across a shadow
 * boundary (the repo's `expectIdrefResolves` unit helper guards that wiring).
 */
async function expectNoSeriousViolations(page: Page, what: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .disableRules(['color-contrast', 'aria-valid-attr-value'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    blocking.map((v) => ({
      rule: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
      why: v.nodes[0]?.failureSummary,
    })),
    `axe violations with ${what}`,
  ).toEqual([]);
}

/** Pick an option in one of the demo's labelled `bs-select`s. */
async function chooseOption(page: Page, ariaLabel: string, label: string): Promise<void> {
  await page.locator(`[aria-label="${ariaLabel}"] select`).selectOption({ label });
}

/**
 * Bring a week-view slot into the viewport and return its centre in page
 * coordinates.
 *
 * Two scrolls are needed and both are easy to get wrong. The page must scroll
 * to the scheduler (the demo page is long), and the scheduler's own scroller
 * must scroll to the slot — a 09:00 slot sits ~720px down inside it. Without
 * this the coordinates are off-screen and `mouse.move` lands somewhere else
 * entirely, which reads as "the drag produced no ghost" rather than "the test
 * never touched the grid".
 */
/**
 * Scroll the scheduler into view and WAIT for the scroll to stop moving.
 * Bootstrap sets a global `scroll-behavior: smooth`, so any coordinates read
 * right after scrollIntoView are stale by the time the mouse reaches them —
 * a drag then lands rows away from where it was aimed.
 */
async function scrollSchedulerIntoView(page: Page): Promise<void> {
  await schedulerRoot(page).evaluate((sched) => sched.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => {
    const w = window as unknown as { __y?: number; __n?: number };
    const y = window.scrollY;
    if (w.__y === y) w.__n = (w.__n ?? 0) + 1;
    else {
      w.__y = y;
      w.__n = 0;
    }
    return (w.__n ?? 0) > 3;
  });
}

async function showSlot(
  page: Page,
  dayIndex: number,
  slotIndex: number,
): Promise<{ x: number; y: number }> {
  // Delegates to slotPoint: hand-scrolling the inner scroller and measuring in
  // one evaluate looks equivalent, but it only guarantees the slot is inside the
  // SCROLLER — not inside the viewport. Once the demo page grew, that produced
  // points below the fold, which `page.mouse` cannot reach at all.
  await scrollSchedulerIntoView(page);
  return slotPoint(page, dayIndex, slotIndex);
}

/**
 * A slot as a Playwright locator.
 *
 * Locators pierce open shadow roots, so the scheduler's internals address
 * directly — and `hover()`/`click()` scroll the element into view and compute
 * its centre themselves. That is the whole reason to prefer them here: the
 * earlier version measured a rect by hand and fed the numbers to
 * `page.mouse.move`, which takes VIEWPORT coordinates, so an element sitting
 * below the fold produced a point no input could ever reach. The gesture then
 * did nothing and the failure looked like a bug in the ghost logic.
 */
function slot(page: Page, day: number, index: number) {
  return page.locator(
    `.scheduler-time-slot[data-day-index="${day}"][data-slot-index="${index}"]`,
  );
}

/**
 * The viewport centre of a slot, guaranteed reachable.
 *
 * Two steps, neither of which computes a coordinate:
 * `scrollIntoViewIfNeeded` makes the element actually visible, and
 * `boundingBox()` is already viewport-relative — the scroll offset is baked in,
 * so nothing is subtracted (doing so would break it; `offsetTop` is the
 * document-relative one).
 *
 * The distinction matters because `page.mouse.move` only lands on points that
 * are on screen. The measurement was never wrong — the element was simply below
 * the fold at y=751 in a 720px viewport, so the press reached nothing and the
 * drag silently did not happen.
 */
async function slotPoint(
  page: Page,
  day: number,
  index: number,
): Promise<{ x: number; y: number }> {
  const target = slot(page, day, index);
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error(`slot ${day}/${index} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('scheduler — multi-day create ghost (R1)', () => {
  test('a drag across three day columns draws one ghost box per column', async ({ page }) => {
    await loadSampleWeek(page);

    // Clear the events first. This gesture is about the create-drag GHOST, not
    // about the sample data, and "pick a slot that happens to be empty" only
    // held while the week started on Monday: the sample events are seeded
    // relative to the current week, so a Sunday-start locale slid them under
    // the very slots this drag uses and turned it into a move.
    // The demo's own Clear, not `events = []`: sample events are nested under
    // `resources` as well, and the component merges both sources.
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => sched.shadowRoot!.querySelectorAll('.scheduler-event').length,
        ),
      )
      .toBe(0);
    // Slot 12 = 06:00, slot 14 = 07:00 with 30-minute slots. Playwright scrolls
    // each into view and aims at its centre; no coordinates are computed here.
    const from = await slotPoint(page, 0, 12);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    // Stepped moves, not `hover()`: a single jump crosses the drag threshold but
    // does not read as travel, so the extent stops where the previous move left
    // it — that is a 2-day span instead of 3.
    const via = await slotPoint(page, 1, 13);
    await page.mouse.move(via.x, via.y, { steps: 6 });
    const to = await slotPoint(page, 2, 14);
    await page.mouse.move(to.x, to.y, { steps: 6 });

    // Measured WHILE the button is down — the ghost is removed on commit. Read
    // the range too, so a failure says whether the drag or the SPLIT is wrong.
    const mid = await schedulerRoot(page).evaluate((sched) => {
      const state = (
        sched as unknown as { stateManager: { getState: () => Record<string, unknown> } }
      ).stateManager.getState();
      const preview = state['previewEvent'] as { start: Date; end: Date } | null;
      return {
        ghosts: sched.shadowRoot!.querySelectorAll('.scheduler-event.preview').length,
        spannedDays: preview
          ? Math.round((preview.end.getTime() - preview.start.getTime()) / 86_400_000) + 1
          : 0,
      };
    });
    await page.mouse.up();

    // One box per spanned day, not a single ~2900px box hanging out of Monday.
    expect(mid.spannedDays).toBe(3);
    expect(mid.ghosts).toBe(3);
  });
});

test.describe('scheduler — drag reaches off-screen time', () => {
  test('holding a drag at the bottom edge scrolls the grid', async ({ page }) => {
    await loadSampleWeek(page);
    // Start high in the day so there is room below to scroll into.
    const from = await showSlot(page, 0, 6);
    const scroller = await schedulerRoot(page).evaluate((sched) => {
      const content = sched.shadowRoot!.querySelector('.scheduler-content')!;
      const r = content.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, scrollTop: content.scrollTop };
    });

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    // Into the bottom edge zone (40px) and hold there. The pointer stops
    // moving, so only the auto-scroll loop can change scrollTop.
    await page.mouse.move(from.x, scroller.bottom - 8, { steps: 8 });

    await expect
      .poll(
        () =>
          schedulerRoot(page).evaluate(
            (sched) => sched.shadowRoot!.querySelector('.scheduler-content')!.scrollTop,
          ),
        { timeout: 5_000 },
      )
      .toBeGreaterThan(scroller.scrollTop + 20);

    await page.mouse.up();

    // And it stops on release rather than running on forever.
    const settled = await schedulerRoot(page).evaluate(
      (sched) => sched.shadowRoot!.querySelector('.scheduler-content')!.scrollTop,
    );
    await page.waitForTimeout(300);
    expect(
      await schedulerRoot(page).evaluate(
        (sched) => sched.shadowRoot!.querySelector('.scheduler-content')!.scrollTop,
      ),
    ).toBe(settled);
  });
});

test.describe('scheduler — timeline (R3, R5, R7)', () => {
  test('scrolls on both axes with the resource column pinned', async ({ page }) => {
    await loadSampleWeek(page);
    await switchView(page, 'timeline');

    // The grid is far wider than the viewport (7 days x 48 slots), so there is
    // something to scroll. This is the whole R5 report.
    const overflow = await schedulerRoot(page).evaluate((sched) => {
      const content = sched.shadowRoot!.querySelector('.scheduler-content')!;
      return { x: content.scrollWidth - content.clientWidth, y: content.scrollHeight };
    });
    expect(overflow.x).toBeGreaterThan(0);

    const before = await schedulerRoot(page).evaluate((sched) => {
      const cell = sched.shadowRoot!.querySelector('.scheduler-resource-cell')!;
      return cell.getBoundingClientRect().x;
    });

    const scrolled = await schedulerRoot(page).evaluate((sched) => {
      const content = sched.shadowRoot!.querySelector('.scheduler-content')!;
      content.scrollLeft = 400;
      return content.scrollLeft;
    });
    expect(scrolled).toBeGreaterThan(0);

    const after = await schedulerRoot(page).evaluate((sched) => {
      const cell = sched.shadowRoot!.querySelector('.scheduler-resource-cell')!;
      return cell.getBoundingClientRect().x;
    });
    // `position: sticky` means the pinned column does not move with the grid.
    expect(Math.abs(after - before)).toBeLessThan(2);
  });

  test('granting resource permissions reveals the add bar, and adding appends a row', async ({
    page,
  }) => {
    // Firefox spends ~45s here even alone (the closing axe scan dominates);
    // under four shared workers that overruns the file's 60s budget.
    test.slow();
    await loadSampleWeek(page);
    await switchView(page, 'timeline');

    // The DEMO starts in resource-admin since M25 (discoverability, R11) —
    // drop to the component's own default first to prove "off means absent".
    await chooseOption(page, 'Permissions', 'Events editable (default)');
    await expect(schedulerRoot(page)).toBeVisible();
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => !!sched.shadowRoot!.querySelector('.scheduler-timeline-addbar'),
        ),
      )
      .toBe(false);

    await chooseOption(page, 'Permissions', 'Events + resource tree editable');
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => !!sched.shadowRoot!.querySelector('.scheduler-timeline-addbar'),
        ),
      )
      .toBe(true);

    const rowsBefore = await schedulerRoot(page).evaluate(
      (sched) => sched.shadowRoot!.querySelectorAll('.scheduler-timeline-row').length,
    );

    // Click through the demo's own handler, which is what materialises the
    // resource — the component only asks.
    await schedulerRoot(page).evaluate((sched) => {
      sched
        .shadowRoot!.querySelector<HTMLElement>(
          '.scheduler-timeline-addbar [data-action="add-resource"]',
        )!
        .click();
    });

    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => sched.shadowRoot!.querySelectorAll('.scheduler-timeline-row').length,
        ),
      )
      .toBe(rowsBefore + 1);

    // Every row has ONE actions trigger, named for its row. The four inline
    // controls (including the recolour input) moved behind it, so the per-row
    // naming contract is now asserted on the trigger.
    const labels = await schedulerRoot(page).evaluate((sched) =>
      Array.from(sched.shadowRoot!.querySelectorAll('.scheduler-row-menu-button')).map((el) =>
        el.getAttribute('aria-label'),
      ),
    );
    expect(labels.length).toBeGreaterThan(1);
    expect(new Set(labels).size).toBe(labels.length);

    // ...and the recolour control still exists, inside the panel that trigger
    // opens, still named for its own row.
    await schedulerRoot(page).evaluate((sched) => {
      sched.shadowRoot!.querySelector<HTMLElement>('.scheduler-row-menu-button')!.click();
    });
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) =>
            sched.shadowRoot!
              .querySelector('.scheduler-row-panel .row-color-input')
              ?.getAttribute('aria-label') ?? null,
        ),
      )
      .toBeTruthy();

    await expectNoSeriousViolations(page, 'timeline resource affordances granted');
  });
});

test.describe('scheduler — month columns line up with their day-name headers', () => {
  // The header row is the same `.scheduler-day-headers` week view uses, with a
  // per-column minimum; the month grid is a CSS grid. Two different sizing
  // systems over one set of columns, so they have to be pinned to the same
  // minimum or they disagree exactly when the panel gets narrow — which is the
  // case no one looks at on a 1400px monitor.
  for (const width of [1400, 900, 600]) {
    test(`header and grid columns match at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await loadSampleWeek(page);
      await switchView(page, 'month');

      const geom = await schedulerRoot(page).evaluate((sched) => {
        const root = sched.shadowRoot!;
        const header = root.querySelector<HTMLElement>('.scheduler-day-header')!.getBoundingClientRect();
        const cell = root.querySelector<HTMLElement>('.scheduler-month-day')!.getBoundingClientRect();
        const content = root.querySelector<HTMLElement>('.scheduler-content')!;
        return {
          headerW: header.width,
          cellW: cell.width,
          headerX: header.x,
          cellX: cell.x,
          overflowX: content.scrollWidth - content.clientWidth,
          columns: root.querySelectorAll('.scheduler-day-header').length,
        };
      });

      expect(geom.columns).toBe(7);
      expect(Math.abs(geom.headerW - geom.cellW)).toBeLessThan(0.5);
      expect(Math.abs(geom.headerX - geom.cellX)).toBeLessThan(0.5);
      // Narrow panels scroll rather than squeezing a day into illegibility; a
      // wide one has nothing to scroll.
      if (width <= 900) expect(geom.overflowX).toBeGreaterThan(0);
      else expect(geom.overflowX).toBe(0);
    });
  }
});

test.describe('scheduler — timeline resize ghost stays on top', () => {
  // The week-view equivalent lives in scheduler-resize.spec.ts. This is the
  // timeline case, and it seeds a FLAT event with a resourceId on purpose: an
  // event authored nested under its resource took a different (working) code
  // path, which is why the regression hid for so long.
  for (const selectFirst of [false, true]) {
    test(`ghost paints over the ${selectFirst ? 'SELECTED' : 'unselected'} source event`, async ({
      page,
    }) => {
      await loadSampleWeek(page);
      await switchView(page, 'timeline');

      await page.evaluate(() => {
        const sched = document.querySelector('mp-scheduler') as HTMLElement & {
          events: unknown[];
          resources: { id: string; children?: unknown[] }[];
        };
        const firstLeaf = (items: { id: string; children?: unknown[] }[]): string => {
          for (const item of items) {
            if (item.children) {
              const found = firstLeaf(item.children as { id: string; children?: unknown[] }[]);
              if (found) return found;
            } else return item.id;
          }
          return '';
        };
        // Seed relative to the date the scheduler is SHOWING, not to today.
        // The demo's sample data is anchored to the ISO Monday and the view
        // follows it, while the week a locale displays starts on its own first
        // weekday — so on some days "today" is not in the visible week at all.
        const day = new Date((sched as unknown as { date?: Date }).date ?? new Date());
        day.setHours(0, 0, 0, 0);
        const at = (h: number) => {
          const d = new Date(day);
          d.setHours(h, 0, 0, 0);
          return d;
        };
        sched.events = [
          {
            id: 'flat-1',
            title: 'Flat',
            resourceId: firstLeaf(sched.resources),
            start: at(9),
            end: at(11),
            color: '#e83e8c',
          },
        ];
      });

      const box = async () => {
        // Bring the scheduler into the viewport BEFORE measuring. Without this
        // the test depended on the demo page happening to be short enough for
        // the timeline to sit above the 720px fold — adding one control to the
        // demo pushed the event to y=723 and `mouse.move` then landed outside
        // the viewport entirely, so the drag never armed and the ghost never
        // appeared. `showSlot` already does this for the same reason.
        await scrollSchedulerIntoView(page);
        return schedulerRoot(page).evaluate((sched) => {
          const ev = Array.from(
            sched.shadowRoot!.querySelectorAll<HTMLElement>(
              '.scheduler-timeline-event:not(.preview)',
            ),
          ).find((e) => e.dataset['eventId'] === 'flat-1');
          if (!ev) return null;
          const content = sched.shadowRoot!.querySelector('.scheduler-content')!;
          content.scrollLeft = ev.offsetLeft - 120;
          const r = ev.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        });
      };

      await expect.poll(box).not.toBeNull();
      let rect = (await box())!;

      if (selectFirst) {
        await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
        rect = (await box())!;
      }

      // Grab the trailing edge and drag right.
      await page.mouse.move(rect.x + rect.w - 2, rect.y + rect.h / 2);
      await page.mouse.down();
      await page.mouse.move(rect.x + rect.w + 60, rect.y + rect.h / 2, { steps: 6 });
      await page.mouse.move(rect.x + rect.w + 140, rect.y + rect.h / 2, { steps: 6 });

      const probe = await schedulerRoot(page).evaluate((sched) => {
        const ghost = sched.shadowRoot!.querySelector<HTMLElement>(
          '.scheduler-timeline-event.preview',
        );
        const source = Array.from(
          sched.shadowRoot!.querySelectorAll<HTMLElement>(
            '.scheduler-timeline-event:not(.preview)',
          ),
        ).find((e) => e.dataset['eventId'] === 'flat-1');
        if (!ghost || !source) return { ghost: !!ghost, source: !!source, top: null, overlap: 0 };
        const g = ghost.getBoundingClientRect();
        const s = source.getBoundingClientRect();
        const overlap = Math.min(g.right, s.right) - Math.max(g.left, s.left);
        // The ghost is pointer-events:none, so hit-testing skips it — re-enable
        // it for the probe only. `pointer-events` plays no part in stacking, so
        // the reported order is still true paint order.
        const restore = ghost.style.pointerEvents;
        ghost.style.pointerEvents = 'auto';
        const stack = (
          sched.shadowRoot as unknown as {
            elementsFromPoint: (x: number, y: number) => Element[];
          }
        ).elementsFromPoint(
          Math.max(g.left, s.left) + overlap / 2,
          g.top + g.height / 2,
        );
        ghost.style.pointerEvents = restore;
        return {
          ghost: true,
          source: true,
          selected: source.classList.contains('selected'),
          top: stack[0]?.className ?? null,
          overlap,
        };
      });
      await page.mouse.up();

      expect(probe.ghost).toBe(true);
      // A non-trivial overlap, so "on top" is not vacuous.
      expect(probe.overlap).toBeGreaterThan(20);
      expect(probe.top).toContain('preview');
      if (selectFirst) expect(probe.selected).toBe(true);
    });
  }
});

test.describe('scheduler — month day popover (R6)', () => {
  test('opens on a day click when configured, and Escape returns focus to the cell', async ({
    page,
  }) => {
    await loadSampleWeek(page);
    await switchView(page, 'month');
    await chooseOption(page, 'Day click action', 'Day click → popover');

    const cellId = await schedulerRoot(page).evaluate((sched) => {
      const cell = sched.shadowRoot!.querySelector<HTMLElement>(
        '.scheduler-month-day:not(.other-month)',
      )!;
      // focus() then click(): a real pointer press focuses a `tabindex="-1"`
      // cell, and `HTMLElement.click()` alone does not — without the focus the
      // test would be asserting focus-return from a state no user can reach.
      cell.focus();
      cell.click();
      return cell.id;
    });

    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => sched.shadowRoot!.querySelector('.scheduler-day-popover')?.getAttribute('role') ?? null,
        ),
      )
      .toBe('dialog');

    // Focus went INTO the panel — a dialog that opens behind the user's focus
    // is announced to nobody.
    expect(
      await schedulerRoot(page).evaluate((sched) => {
        const active = sched.shadowRoot!.activeElement;
        return !!active && !!active.closest('.scheduler-day-popover');
      }),
    ).toBe(true);

    await expectNoSeriousViolations(page, 'the day popover open');

    await page.keyboard.press('Escape');

    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => !!sched.shadowRoot!.querySelector('.scheduler-day-popover'),
        ),
      )
      .toBe(false);
    // Focus must come back to the day it was opened from, not fall to <body>.
    expect(
      await schedulerRoot(page).evaluate(
        (sched) => (sched.shadowRoot!.activeElement as HTMLElement | null)?.id ?? null,
      ),
    ).toBe(cellId);
  });
});

/**
 * Phase 2 (PRD §12). Seed one flat event with a resourceId — the same fixture
 * shape as the resize-ghost suite, for the same reason: flat + resourceId is
 * the shape every API response produces.
 */
async function seedTimelineEvent(page: Page): Promise<{ first: string; second: string }> {
  return page.evaluate(() => {
    const sched = document.querySelector('mp-scheduler') as HTMLElement & {
      events: unknown[];
      resources: { id: string; children?: unknown[] }[];
    };
    const leaves: string[] = [];
    const walk = (items: { id: string; children?: unknown[] }[]): void => {
      for (const item of items) {
        if (item.children) walk(item.children as { id: string; children?: unknown[] }[]);
        else leaves.push(item.id);
      }
    };
    walk(sched.resources);
    // Seed relative to the date the scheduler is SHOWING, not to today — see
    // the note in the resize-ghost test above.
    const day = new Date((sched as unknown as { date?: Date }).date ?? new Date());
    day.setHours(0, 0, 0, 0);
    const at = (h: number) => {
      const d = new Date(day);
      d.setHours(h, 0, 0, 0);
      return d;
    };
    sched.events = [
      { id: 'movable', title: 'Movable', resourceId: leaves[0], start: at(9), end: at(11) },
      // Keeps the bucket row rendered, so there is somewhere to drop into.
      { id: 'loose', title: 'Loose', start: at(13), end: at(14) },
    ];
    return { first: leaves[0], second: leaves[1] };
  });
}

async function timelineEventRect(
  page: Page,
  id: string,
): Promise<{ x: number; y: number; w: number; h: number }> {
  return schedulerRoot(page).evaluate((sched, eventId) => {
    const ev = Array.from(
      sched.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event:not(.preview)'),
    ).find((e) => e.dataset['eventId'] === eventId);
    if (!ev) throw new Error(`no event ${eventId}`);
    const content = sched.shadowRoot!.querySelector('.scheduler-content')!;
    content.scrollLeft = Math.max(0, ev.offsetLeft - 160);
    const r = ev.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, id);
}

/** Which row (by rowheader text) an event currently renders in. */
async function rowOfEvent(page: Page, id: string): Promise<string | null> {
  return schedulerRoot(page).evaluate((sched, eventId) => {
    const ev = Array.from(
      sched.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event:not(.preview)'),
    ).find((e) => e.dataset['eventId'] === eventId);
    const row = ev?.closest('.scheduler-timeline-row');
    return row?.querySelector('.resource-title')?.textContent?.trim() ?? null;
  }, id);
}

test.describe('scheduler — drag-move between resources (R13)', () => {
  test('dragging an event onto another row re-assigns it, with row-scoped feedback', async ({
    page,
  }) => {
    await loadSampleWeek(page);
    await switchView(page, 'timeline');
    await seedTimelineEvent(page);

    await scrollSchedulerIntoView(page);
    const from = await timelineEventRect(page, 'movable');
    // The second resource row's centre, at the SAME x (a pure vertical drag —
    // the time must not change).
    const target = await schedulerRoot(page).evaluate((sched, fromX) => {
      const rows = Array.from(
        sched.shadowRoot!.querySelectorAll<HTMLElement>(
          '.scheduler-timeline-row:not(.group):not(.unassigned)',
        ),
      );
      const r = rows[1].getBoundingClientRect();
      return {
        x: fromX,
        y: r.y + r.height / 2,
        title: rows[1].querySelector('.resource-title')!.textContent!.trim(),
      };
    }, from.x + from.w / 2);

    await page.mouse.move(from.x + from.w / 2, from.y + from.h / 2);
    await page.mouse.down();
    // The press has to be observed before the moves arrive: on a warm run the
    // whole gesture is delivered inside one frame, the drag never arms, and no
    // ghost is ever rendered. This test failed about one run in four for that
    // reason, and every run after the first in a repeated pass.
    await page.waitForTimeout(50);
    await page.mouse.move(target.x, (from.y + target.y) / 2, { steps: 5 });
    await page.waitForTimeout(50);
    // Re-read the target row's position INSIDE the drag. A drag near a
    // container edge auto-scrolls the grid, so a rect measured before
    // `mouse.down()` can name a row that has since moved out from under the
    // pointer — which is how this landed back on the source row.
    const targetY = await schedulerRoot(page).evaluate((sched, title) => {
      const row = Array.from(
        sched.shadowRoot!.querySelectorAll<HTMLElement>(
          '.scheduler-timeline-row:not(.group):not(.unassigned)',
        ),
      ).find((r) => r.querySelector('.resource-title')?.textContent?.trim() === title)!;
      const rect = row.getBoundingClientRect();
      return rect.y + rect.height / 2;
    }, target.title);
    await page.mouse.move(target.x, targetY, { steps: 5 });

    // Mid-drag: the ghost sits in the TARGET row, and only that row is marked.
    //
    // Read on a settle rather than immediately. The ghost is rendered a frame
    // behind the pointer and moves row by row as the gesture crosses them, so
    // a bare read caught it either absent or still in the SOURCE row — the
    // cause of this test's flakiness, not anything about the scheduler. The
    // poll gives up after 2s and returns whatever it last saw, so a genuine
    // regression still fails on the assertion below with a real row name.
    const mid = await schedulerRoot(page).evaluate(
      (sched, expected) =>
        new Promise<{
          ghostRowTitle: string | null;
          dropTargets: number;
          greyedOutsideTarget: boolean;
        }>((resolve) => {
          const deadline = performance.now() + 2000;
          const read = () => {
            const ghost = sched.shadowRoot!.querySelector('.scheduler-timeline-event.preview');
            const ghostRow = ghost?.closest('.scheduler-timeline-row');
            return {
              ghostRowTitle:
                ghostRow?.querySelector('.resource-title')?.textContent?.trim() ?? null,
              dropTargets: sched.shadowRoot!.querySelectorAll(
                '.scheduler-timeline-row.drop-target',
              ).length,
              greyedOutsideTarget: Array.from(
                sched.shadowRoot!.querySelectorAll('.scheduler-timeline-slot.greyed'),
              ).some((slot) => !slot.closest('.drop-target')),
            };
          };
          const poll = () => {
            const state = read();
            if (state.ghostRowTitle === expected || performance.now() > deadline) resolve(state);
            else requestAnimationFrame(poll);
          };
          poll();
        }),
      target.title,
    );
    await page.mouse.up();

    expect(mid.ghostRowTitle).toBe(target.title);
    expect(mid.dropTargets).toBe(1);
    expect(mid.greyedOutsideTarget).toBe(false);

    // Committed: the demo applied event-update, the event re-parented.
    await expect.poll(() => rowOfEvent(page, 'movable')).toBe(target.title);
  });

  test('dragging into the bucket row un-assigns the event', async ({ page }) => {
    await loadSampleWeek(page);
    await switchView(page, 'timeline');
    await seedTimelineEvent(page);

    await scrollSchedulerIntoView(page);
    const from = await timelineEventRect(page, 'movable');
    const bucket = await schedulerRoot(page).evaluate((sched, fromX) => {
      const row = sched.shadowRoot!.querySelector<HTMLElement>(
        '.scheduler-timeline-row.unassigned',
      )!;
      row.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      const r = row.getBoundingClientRect();
      return { x: fromX, y: r.y + r.height / 2 };
    }, from.x + from.w / 2);

    await page.mouse.move(from.x + from.w / 2, from.y + from.h / 2);
    await page.mouse.down();
    await page.mouse.move(bucket.x, (from.y + bucket.y) / 2, { steps: 5 });
    await page.mouse.move(bucket.x, bucket.y, { steps: 5 });
    await page.mouse.up();

    // The event now renders in the "(No resource)" row — the wire carried the
    // un-assignment and the demo applied it.
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate((sched) => {
          const ev = Array.from(
            sched.shadowRoot!.querySelectorAll<HTMLElement>(
              '.scheduler-timeline-event:not(.preview)',
            ),
          ).find((e) => e.dataset['eventId'] === 'movable');
          return !!ev?.closest('.scheduler-timeline-row.unassigned');
        }),
      )
      .toBe(true);
  });
});

test.describe('scheduler — year date surface (R12)', () => {
  test('Space on a month card opens the month popover; Escape returns to the card', async ({
    page,
  }) => {
    await loadSampleWeek(page);
    await switchView(page, 'year');

    const cardId = await schedulerRoot(page).evaluate((sched) => {
      const card = sched.shadowRoot!.querySelector<HTMLElement>(
        '.scheduler-year-month[tabindex="0"]',
      )!;
      card.focus();
      return card.id;
    });
    await page.keyboard.press(' ');

    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) =>
            sched.shadowRoot!.querySelector('.scheduler-day-popover')?.getAttribute('role') ??
            null,
        ),
      )
      .toBe('dialog');

    // Anchored: the fixed panel sits near its card, not at the layout origin —
    // the B23 failure mode was an unpositioned panel.
    const anchored = await schedulerRoot(page).evaluate((sched, id) => {
      const panel = sched.shadowRoot!.querySelector<HTMLElement>('.scheduler-day-popover')!;
      const card = sched.shadowRoot!.getElementById(id)!;
      const p = panel.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      return {
        dx: Math.abs(p.x - c.x),
        dy: Math.abs(p.y - c.y),
        positioned: panel.style.top !== '' || panel.style.left !== '',
      };
    }, cardId);
    expect(anchored.positioned).toBe(true);
    expect(anchored.dx + anchored.dy).toBeLessThan(900);

    await expectNoSeriousViolations(page, 'the year month popover open');

    await page.keyboard.press('Escape');
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => (sched.shadowRoot!.activeElement as HTMLElement | null)?.id ?? null,
        ),
      )
      .toBe(cardId);
  });
});

test.describe('scheduler — popover delete + built-in editor (R14, R20)', () => {
  test('the popover row delete removes the event from the demo data', async ({ page }) => {
    await loadSampleWeek(page);
    await switchView(page, 'month');

    // Open via a day-cell click (dayClickAction now defaults to popover).
    await schedulerRoot(page).evaluate((sched) => {
      const chip = sched.shadowRoot!.querySelector<HTMLElement>('.scheduler-month-event')!;
      const cell = chip.closest<HTMLElement>('.scheduler-month-day')!;
      cell.focus();
      cell.click();
    });
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => sched.shadowRoot!.querySelectorAll('.popover-event').length,
        ),
      )
      .toBeGreaterThan(0);

    const before = await schedulerRoot(page).evaluate((sched) => ({
      rows: sched.shadowRoot!.querySelectorAll('.popover-event').length,
      events: (sched as unknown as { events: unknown[] }).events.length,
    }));

    await schedulerRoot(page).evaluate((sched) => {
      sched.shadowRoot!.querySelector<HTMLElement>('.popover-event-delete')!.click();
    });

    // The demo's event-delete handler applied it; the popover stays open and
    // its list shrank with the data.
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => (sched as unknown as { events: unknown[] }).events.length,
        ),
      )
      .toBe(before.events - 1);
    expect(
      await schedulerRoot(page).evaluate(
        (sched) => sched.shadowRoot!.querySelectorAll('.popover-event').length,
      ),
    ).toBe(before.rows - 1);
    expect(
      await schedulerRoot(page).evaluate(
        (sched) => !!sched.shadowRoot!.querySelector('.scheduler-day-popover'),
      ),
    ).toBe(true);
  });

  test('double-click opens the built-in editor; Save renames the chip', async ({ page }) => {
    await loadSampleWeek(page);
    await showSlot(page, 2, 24); // brings midday Wednesday into view
    const box = await schedulerRoot(page).evaluate((sched) => {
      const ev = Array.from(
        sched.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-event:not(.preview)'),
      ).find((e) => e.textContent!.includes('Lunch'));
      if (!ev) throw new Error('no Lunch event');
      ev.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = ev.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 20) };
    });

    await page.mouse.dblclick(box.x, box.y);

    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) =>
            sched.shadowRoot!.querySelector('.scheduler-event-editor')?.getAttribute('role') ??
            null,
        ),
      )
      .toBe('dialog');

    await expectNoSeriousViolations(page, 'the event editor open');

    // The colour is two-state and an <mp-checkbox> owns which one applies. This
    // sample event carries no colour, so it opens INHERITING: checked, swatch
    // disabled — the state in which Save must not pin a colour. Only a real
    // click proves the WC's own input → change → swatch wiring, which a unit
    // test setting the host property cannot.
    const inheritState = await schedulerRoot(page).evaluate((sched) => {
      const cb = sched.shadowRoot!.querySelector<HTMLElement & { checked: boolean }>(
        'mp-checkbox.editor-inherit-input',
      );
      const swatch = sched.shadowRoot!.querySelector<HTMLInputElement>('.editor-color-input');
      return { checked: cb?.checked ?? null, swatchDisabled: swatch?.disabled ?? null };
    });
    expect(inheritState).toEqual({ checked: true, swatchDisabled: true });

    // Playwright's CSS engine pierces open shadow roots, so this is a genuine
    // pointer click on the checkbox nested two shadow roots deep.
    await page.locator('mp-checkbox.editor-inherit-input').click();
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) =>
            sched.shadowRoot!.querySelector<HTMLInputElement>('.editor-color-input')!.disabled,
        ),
      )
      .toBe(false);

    // Dispatch REAL input events: the editor commits its own draft, which is
    // fed by these events — assigning `.value` alone is not user input, and
    // pretending otherwise is precisely what let B31 hide.
    await schedulerRoot(page).evaluate((sched) => {
      const set = (sel: string, value: string) => {
        const input = sched.shadowRoot!.querySelector<HTMLInputElement>(sel)!;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set('.editor-title-input', 'Lunch & Learn (renamed)');
      set('.editor-color-input', '#123456');
    });
    // And click Save with a REAL mouse press, so the mousedown-driven re-render
    // that broke this path actually happens.
    const saveAt = await schedulerRoot(page).evaluate((sched) => {
      const r = sched
        .shadowRoot!.querySelector<HTMLElement>('.editor-action.primary')!
        .getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(saveAt.x, saveAt.y);

    await expect
      .poll(() =>
        schedulerRoot(page).evaluate((sched) =>
          Array.from(sched.shadowRoot!.querySelectorAll('.scheduler-event:not(.preview)')).some(
            (e) => e.textContent!.includes('(renamed)'),
          ),
        ),
      )
      .toBe(true);
    // Closed after Save.
    expect(
      await schedulerRoot(page).evaluate(
        (sched) => !!sched.shadowRoot!.querySelector('.scheduler-event-editor'),
      ),
    ).toBe(false);
    // And the un-inherited colour actually landed on the chip.
    expect(
      await schedulerRoot(page).evaluate((sched) => {
        const ev = Array.from(
          sched.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-event:not(.preview)'),
        ).find((e) => e.textContent!.includes('(renamed)'))!;
        return getComputedStyle(ev).backgroundColor;
      }),
    ).toBe('rgb(18, 52, 86)'); // #123456
  });
});

test.describe('scheduler — resource column resize (R15)', () => {
  test('dragging the separator widens the column, and the width survives a view switch', async ({
    page,
  }) => {
    await loadSampleWeek(page);
    await switchView(page, 'timeline');
    await scrollSchedulerIntoView(page);

    const grip = await schedulerRoot(page).evaluate((sched) => {
      const resizer = sched.shadowRoot!.querySelector<HTMLElement>('.scheduler-column-resizer')!;
      const r = resizer.getBoundingClientRect();
      const header = sched
        .shadowRoot!.querySelector<HTMLElement>('.scheduler-resource-header')!
        .getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, width: header.width };
    });

    await page.mouse.move(grip.x, grip.y);
    await page.mouse.down();
    await page.mouse.move(grip.x + 80, grip.y, { steps: 5 });
    await page.mouse.up();

    const widened = await schedulerRoot(page).evaluate(
      (sched) =>
        sched
          .shadowRoot!.querySelector<HTMLElement>('.scheduler-resource-header')!
          .getBoundingClientRect().width,
    );
    expect(widened).toBeGreaterThan(grip.width + 60);

    // Sticky across a rebuild: the width rides an inline custom property on the
    // scroller, which view switches do not touch.
    await switchView(page, 'week');
    await switchView(page, 'timeline');
    const persisted = await schedulerRoot(page).evaluate(
      (sched) =>
        sched
          .shadowRoot!.querySelector<HTMLElement>('.scheduler-resource-header')!
          .getBoundingClientRect().width,
    );
    expect(Math.abs(persisted - widened)).toBeLessThan(2);
  });
});

test.describe('scheduler — nested datetime picker in the editor (R20)', () => {
  test('Escape dismisses the calendar it was aimed at, not the editor around it', async ({
    page,
  }) => {
    await loadSampleWeek(page);
    await showSlot(page, 2, 24);
    const box = await schedulerRoot(page).evaluate((sched) => {
      const ev = Array.from(
        sched.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-event:not(.preview)'),
      ).find((e) => e.textContent!.includes('Lunch'));
      if (!ev) throw new Error('no Lunch event');
      ev.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = ev.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 20) };
    });
    await page.mouse.dblclick(box.x, box.y);

    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => !!sched.shadowRoot!.querySelector('.scheduler-event-editor'),
        ),
      )
      .toBe(true);

    // The start field is an <mp-datetime-picker>, and its value came across as
    // a real Date — the editor no longer round-trips times through strings.
    expect(
      await schedulerRoot(page).evaluate(
        (sched) =>
          (
            sched.shadowRoot!.querySelector(
              'mp-datetime-picker.editor-start-input',
            ) as HTMLElement & { value: Date | null }
          ).value instanceof Date,
      ),
    ).toBe(true);

    // Open its calendar through the picker's own trigger button, two shadow
    // roots deep. Playwright's CSS engine pierces open shadow roots.
    await page.locator('mp-datetime-picker.editor-start-input button.date').click();
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) =>
            sched
              .shadowRoot!.querySelector('mp-datetime-picker.editor-start-input')!
              .getAttribute('data-open'),
        ),
      )
      .toBe('date');

    // THE POINT: the calendar pushed a dismiss frame on top of the editor's, so
    // this Escape belongs to the calendar. The editor — and the user's unsaved
    // edits — must survive it.
    await page.keyboard.press('Escape');
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) =>
            sched
              .shadowRoot!.querySelector('mp-datetime-picker.editor-start-input')!
              .getAttribute('data-open'),
        ),
      )
      .toBeNull();
    expect(
      await schedulerRoot(page).evaluate(
        (sched) => !!sched.shadowRoot!.querySelector('.scheduler-event-editor'),
      ),
    ).toBe(true);

    await expectNoSeriousViolations(page, 'the event editor with a datetime picker');

    // With nothing on top of it any more, the next Escape closes the editor.
    await page.keyboard.press('Escape');
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => !!sched.shadowRoot!.querySelector('.scheduler-event-editor'),
        ),
      )
      .toBe(false);
  });
});

test.describe('scheduler — editing an event moves it (B30)', () => {
  test('right-click, pick a later start, Save — the event moves and keeps its duration', async ({
    page,
  }) => {
    await loadSampleWeek(page);
    await scrollSchedulerIntoView(page);

    const box = await schedulerRoot(page).evaluate((sched) => {
      const ev = Array.from(
        sched.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-event:not(.preview)'),
      ).find((e) => e.textContent!.includes('Lunch'));
      if (!ev) throw new Error('no Lunch event');
      ev.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = ev.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 20) };
    });

    const before = await schedulerRoot(page).evaluate((sched) => {
      const e = (
        sched as unknown as { events: { title: string; start: Date; end: Date }[] }
      ).events.find((x) => x.title.includes('Lunch'))!;
      return { start: e.start.getTime(), end: e.end.getTime() };
    });

    // Right-click — the opener the report used.
    await page.mouse.click(box.x, box.y, { button: 'right' });
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => !!sched.shadowRoot!.querySelector('.scheduler-event-editor'),
        ),
      )
      .toBe(true);

    await page.locator('mp-datetime-picker.editor-start-input button.date').click();
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate((sched) =>
          sched
            .shadowRoot!.querySelector('mp-datetime-picker.editor-start-input')!
            .getAttribute('data-open'),
        ),
      )
      .toBe('date');

    // A real click on a real day cell, three shadow roots deep
    // (scheduler → picker → calendar).
    const cell = await page.evaluate(() => {
      const sched = document.querySelector('mp-scheduler')!;
      const picker = sched.shadowRoot!.querySelector('mp-datetime-picker.editor-start-input')!;
      const cal = picker.shadowRoot!.querySelector('mp-calendar')!;
      const cells = Array.from(
        cal.shadowRoot!.querySelectorAll<HTMLElement>('td[role="gridcell"]'),
      ).filter(
        (td) =>
          /^\d+$/.test(td.textContent?.trim() ?? '') &&
          td.getAttribute('aria-disabled') !== 'true' &&
          !td.classList.contains('selected'),
      );
      const target = cells[cells.length - 1];
      if (!target) return null;
      const r = target.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    expect(cell).not.toBeNull();
    await page.mouse.click(cell!.x, cell!.y);

    // The end follows the start LIVE, before any Save — the user has to be able
    // to see what they are about to commit.
    const shifted = await schedulerRoot(page).evaluate((sched) => {
      const read = (cls: string) =>
        (
          sched.shadowRoot!.querySelector(`mp-datetime-picker.${cls}`) as HTMLElement & {
            value: Date | null;
          }
        ).value!.getTime();
      return { start: read('editor-start-input'), end: read('editor-end-input') };
    });
    expect(shifted.end - shifted.start).toBe(before.end - before.start);
    expect(shifted.start).toBeGreaterThan(before.start);

    // A REAL mouse click: a programmatic .click() fires no mousedown, and the
    // mousedown-driven re-render is exactly what used to discard the edit (B31).
    const saveAt = await schedulerRoot(page).evaluate((sched) => {
      const r = sched
        .shadowRoot!.querySelector<HTMLElement>('.editor-action.primary')!
        .getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.click(saveAt.x, saveAt.y);

    // Committed: no "End must be after start" dead end, and the demo applied it.
    await expect
      .poll(() =>
        schedulerRoot(page).evaluate(
          (sched) => !!sched.shadowRoot!.querySelector('.scheduler-event-editor'),
        ),
      )
      .toBe(false);
    const after = await schedulerRoot(page).evaluate((sched) => {
      const e = (
        sched as unknown as { events: { title: string; start: Date; end: Date }[] }
      ).events.find((x) => x.title.includes('Lunch'))!;
      return { start: e.start.getTime(), end: e.end.getTime() };
    });
    expect(after.start).toBe(shifted.start);
    expect(after.end - after.start).toBe(before.end - before.start);
  });
});
