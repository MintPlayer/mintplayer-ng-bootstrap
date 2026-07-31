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
async function showSlot(
  page: Page,
  dayIndex: number,
  slotIndex: number,
): Promise<{ x: number; y: number }> {
  const selector = `.scheduler-time-slot[data-day-index="${dayIndex}"][data-slot-index="${slotIndex}"]`;
  await schedulerRoot(page).evaluate((sched) => sched.scrollIntoView({ block: 'center' }));
  // Bootstrap sets a global `scroll-behavior: smooth`, so scrollIntoView is
  // still animating on the next line unless we wait for it to settle.
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
  return schedulerRoot(page).evaluate((sched, sel) => {
    const slot = sched.shadowRoot!.querySelector<HTMLElement>(sel);
    if (!slot) throw new Error(`no slot for ${sel}`);
    const content = sched.shadowRoot!.querySelector('.scheduler-content')!;
    content.scrollTop = slot.offsetTop - 60;
    const r = slot.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, selector);
}

test.describe('scheduler — multi-day create ghost (R1)', () => {
  test('a drag across three day columns draws one ghost box per column', async ({ page }) => {
    await loadSampleWeek(page);

    // Slot 12 = 06:00 with 30-minute slots: deliberately an EMPTY slot. Starting
    // on 09:00 lands on the sample data's Sprint Planning and turns the gesture
    // into a move-drag, which previews one box legitimately.
    const from = await showSlot(page, 0, 12);
    const to = await showSlot(page, 2, 14);

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    // Two moves: the first crosses the drag threshold, the second lands the
    // extent. A single move can be swallowed as a click on some engines.
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
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
    await loadSampleWeek(page);
    await switchView(page, 'timeline');

    // Off by default: nothing to see.
    await expect(schedulerRoot(page)).toBeVisible();
    expect(
      await schedulerRoot(page).evaluate(
        (sched) => !!sched.shadowRoot!.querySelector('.scheduler-timeline-addbar'),
      ),
    ).toBe(false);

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

    // And the recolour control exists for every row, with a per-row name.
    const labels = await schedulerRoot(page).evaluate((sched) =>
      Array.from(sched.shadowRoot!.querySelectorAll('.scheduler-resource-color')).map((el) =>
        el.getAttribute('aria-label'),
      ),
    );
    expect(labels.length).toBeGreaterThan(1);
    expect(new Set(labels).size).toBe(labels.length);

    await expectNoSeriousViolations(page, 'timeline resource affordances granted');
  });
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
