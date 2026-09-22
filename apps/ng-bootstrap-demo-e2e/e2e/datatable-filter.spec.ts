import { test, expect, type Page } from '@playwright/test';

/**
 * The filter panel, in a real browser.
 *
 * Every other test for this feature runs under jsdom, which has no layout — and
 * that blind spot has already shipped two bugs: the panel rendered at the
 * viewport's top-left because `position: fixed` was missing, and later rendered
 * with no border at all because a portalled element inherits none of the
 * component's custom properties. Both passed a green unit suite and were caught
 * by a human looking at the page.
 *
 * So this spec asserts only the things jsdom *cannot*: geometry, the real focus
 * trap, and event plumbing that crosses the portal boundary. Behaviour that
 * jsdom can see is pinned in `mp-datatable.filter-default.spec.ts` and is not
 * duplicated here.
 */

// The demo's artist API, mocked so the page is deterministic and offline.
async function mockArtistApi(page: Page) {
  const artists = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    name: `Artist ${String(i + 1).padStart(2, '0')}`,
    yearStarted: 1960 + (i % 30),
    yearQuit: i % 4 === 0 ? null : 2000 + (i % 20),
  }));

  await page.route('**/api/v1/artist/page', async (route) => {
    const req = JSON.parse(route.request().postData() ?? '{}') as { page?: number; perPage?: number };
    const page_ = req.page ?? 1;
    const perPage = req.perPage ?? 20;
    const start = (page_ - 1) * perPage;
    const slice = artists.slice(start, start + perPage);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: slice,
        totalRecords: artists.length,
        totalPages: Math.ceil(artists.length / perPage),
        page: page_,
        perPage,
      }),
    });
  });
}

const FILTER_TABLE = '.filter-table mp-datatable';
const PANEL = '.mp-overlay-pane .filter-panel';

const trigger = (page: Page, column: string) =>
  page.locator(`${FILTER_TABLE} tr.filter-row th[data-column="${column}"] .filter-trigger`);

async function openPanel(page: Page, column: string) {
  await trigger(page, column).click();
  await expect(page.locator(PANEL)).toBeVisible();
}

test.describe('bs-datatable filter panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockArtistApi(page);
    await page.goto('/enterprise/datatables');
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });
    await page.getByRole('heading', { name: /Column filters/i }).scrollIntoViewIfNeeded();
    await expect(page.locator(`${FILTER_TABLE} tr.filter-row`)).toBeVisible();
  });

  /**
   * The bug that shipped: `OverlayController` positions by writing `left`/`top`,
   * which a statically-positioned element ignores, so the panel rendered at the
   * pane's origin — the viewport's top-left — regardless of its trigger.
   */
  test('opens next to its trigger, not at the viewport origin', async ({ page }) => {
    await openPanel(page, 'name');

    const panel = await page.locator(PANEL).boundingBox();
    const btn = await trigger(page, 'name').boundingBox();
    expect(panel).not.toBeNull();
    expect(btn).not.toBeNull();

    // The bug put the panel at the pane's origin, so this is the assertion
    // that matters: it is somewhere deliberate, not at (0, 0).
    expect(panel!.x).toBeGreaterThan(0);
    expect(panel!.y).toBeGreaterThan(0);
    expect(Math.abs(panel!.x - btn!.x)).toBeLessThan(400);

    // Vertically ADJACENT to the trigger, on whichever side there was room.
    // Not "below it": the overlay flips up when the list is tall enough that
    // opening downward would leave the viewport, which is correct behaviour and
    // is what this demo does with 40 rows.
    const gapBelow = Math.abs(panel!.y - (btn!.y + btn!.height));
    const gapAbove = Math.abs(btn!.y - (panel!.y + panel!.height));
    expect(Math.min(gapBelow, gapAbove)).toBeLessThan(24);
  });

  /**
   * The demo's filter table runs in VIRTUAL mode, which is the harder case and
   * the one §9.3 measured as worse ("clipped on both axes"). Asserted rather
   * than assumed: if the demo is ever switched to paged, the clipping and
   * occlusion tests below would keep passing while quietly losing their teeth.
   */
  test('exercises the virtual-scroll configuration', async ({ page }) => {
    const mode = await page.evaluate((tableSel) => {
      const scroller = document.querySelector(`${tableSel} .datatable-scroll`);
      const th = document.querySelector(`${tableSel} thead tr:first-child th`);
      if (!scroller || !th) return null;
      const cs = getComputedStyle(th);
      return {
        virtual: scroller.classList.contains('datatable-virtual'),
        headerPosition: cs.position,
        headerZIndex: cs.zIndex,
      };
    }, FILTER_TABLE);

    expect(mode).not.toBeNull();
    expect(mode!.virtual).toBe(true);
    // The sticky header is what the panel has to beat — in paged mode there is
    // nothing for it to be occluded by, only clipped by.
    expect(mode!.headerPosition).toBe('sticky');
    expect(Number(mode!.headerZIndex)).toBeGreaterThan(0);
  });

  /**
   * The whole reason for the portal: an in-flow panel is clipped by
   * `.datatable-scroll`. Measured in three engines during the spikes, whose
   * harnesses were then deleted — this keeps the property under test in the two
   * the Playwright projects cover.
   */
  test('is not clipped by the scroll container', async ({ page }) => {
    await openPanel(page, 'name');

    const escapes = await page.evaluate(
      ({ panelSel, tableSel }) => {
        const panel = document.querySelector(panelSel) as HTMLElement | null;
        const scroller = document.querySelector(`${tableSel} .datatable-scroll`) as HTMLElement | null;
        if (!panel || !scroller) return null;
        const p = panel.getBoundingClientRect();
        const s = scroller.getBoundingClientRect();
        return {
          // Escapes the scroller's box on SOME edge — whichever way it opened.
          // An in-flow panel is clipped to this box by `overflow: auto`, so any
          // overflow at all is only possible from outside it.
          escapesScroller:
            p.top < s.top || p.bottom > s.bottom || p.right > s.right || p.left < s.left,
          // Painted, not collapsed: a clipped panel reports zero here.
          hasSize: p.width > 0 && p.height > 0,
          // Fully reachable — escaping the scroller is no good if it then lands
          // outside the viewport.
          insideViewport:
            p.top >= 0 &&
            p.left >= 0 &&
            p.bottom <= window.innerHeight + 1 &&
            p.right <= window.innerWidth + 1,
          // Not a descendant of the table at all.
          outsideTable: !document.querySelector(tableSel)!.contains(panel),
        };
      },
      { panelSel: PANEL, tableSel: FILTER_TABLE },
    );

    expect(escapes).not.toBeNull();
    expect(escapes!.hasSize).toBe(true);
    expect(escapes!.outsideTable).toBe(true);
    expect(escapes!.escapesScroller).toBe(true);
    expect(escapes!.insideViewport).toBe(true);
  });

  /**
   * Clipping is not the only virtual-mode hazard: `thead th` is
   * `position: sticky; z-index: 1` there, so the panel has something to be
   * painted *over* by, not merely cut off by. Escaping `overflow: auto` would
   * be no use if the header then covered it.
   *
   * Hit-tested rather than reasoned about from z-index values: what matters is
   * which element the browser says is on top at that point.
   *
   * The overlap is FORCED, not hoped for. A short viewport with the trigger
   * scrolled hard against the bottom leaves no room below, so the panel has to
   * open upward across the header — which lets the occlusion assertion be
   * unconditional. An earlier version guarded it with `if (overlaps)`, which
   * would have gone green while testing nothing the moment placement changed:
   * the panel's own centre is nearly free when it opens downward, because it
   * sits over the table body where nothing was going to paint over it anyway.
   */
  test('is painted above the sticky header', async ({ page }) => {
    // Open FIRST, then move the trigger. Scrolling the trigger against the
    // viewport edge before clicking makes it unclickable — Playwright runs its
    // own scroll-into-view and actionability check, which fought the manual
    // scroll and timed out in Firefox. The overlay uses
    // `scrollStrategy: 'reposition'`, so it follows the trigger instead of
    // closing, and the flip happens while the panel is already up.
    await openPanel(page, 'name');

    await page.setViewportSize({ width: 1280, height: 520 });

    // Leave the trigger less room below than any panel needs, so the overlay
    // has to flip up across the header.
    await page.evaluate((tableSel) => {
      const btn = document.querySelector(
        `${tableSel} tr.filter-row th[data-column="name"] .filter-trigger`,
      ) as HTMLElement | null;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      window.scrollBy(0, r.top - (window.innerHeight - r.height - 8));
    }, FILTER_TABLE);

    // The reposition runs off a scroll listener; let it land before measuring.
    await expect(page.locator(PANEL)).toBeVisible();
    await page.waitForTimeout(150);

    const onTop = await page.evaluate(
      ({ panelSel, tableSel }) => {
        const panel = document.querySelector(panelSel) as HTMLElement | null;
        const header = document.querySelector(`${tableSel} thead`) as HTMLElement | null;
        if (!panel || !header) return null;
        const p = panel.getBoundingClientRect();
        const h = header.getBoundingClientRect();

        const hit = (x: number, y: number) => {
          const el = document.elementFromPoint(x, y);
          return el ? panel === el || panel.contains(el) : false;
        };

        // The panel's own centre: nothing may paint over it.
        const centreIsPanel = hit(p.left + p.width / 2, p.top + p.height / 2);

        // And, where it overlaps the sticky header, the panel must win there too.
        const overlapTop = Math.max(p.top, h.top);
        const overlapBottom = Math.min(p.bottom, h.bottom);
        const overlaps = overlapBottom - overlapTop > 2;
        const overlapIsPanel = overlaps
          ? hit(p.left + p.width / 2, (overlapTop + overlapBottom) / 2)
          : null;

        return { centreIsPanel, overlaps, overlapIsPanel };
      },
      { panelSel: PANEL, tableSel: FILTER_TABLE },
    );

    expect(onTop).not.toBeNull();
    // The setup exists to make this true; if it ever is not, the test has
    // stopped exercising occlusion and must fail rather than pass vacuously.
    expect(onTop!.overlaps).toBe(true);
    expect(onTop!.overlapIsPanel).toBe(true);
    expect(onTop!.centreIsPanel).toBe(true);
  });

  /**
   * The second jsdom-invisible bug: `--mp-datatable-*` are declared on the
   * element, and a portalled panel is not a descendant of it, so a bare
   * `var(--mp-datatable-border-color)` was invalid at computed-value time and
   * `border-style` silently fell back to `none`.
   */
  test('is styled by the light-tier sheet across the portal', async ({ page }) => {
    await openPanel(page, 'name');

    const styles = await page.evaluate((sel) => {
      const panel = document.querySelector(sel) as HTMLElement | null;
      if (!panel) return null;
      const cs = getComputedStyle(panel);
      return { position: cs.position, borderStyle: cs.borderTopStyle, borderWidth: cs.borderTopWidth };
    }, PANEL);

    expect(styles).not.toBeNull();
    expect(styles!.position).toBe('fixed');
    expect(styles!.borderStyle).not.toBe('none');
    expect(parseFloat(styles!.borderWidth)).toBeGreaterThan(0);
  });

  /**
   * The a11y claim in the PR description was an inference from composition:
   * `OverlayController`'s focus trap is covered generically, but nothing
   * exercised it THROUGH mp-datatable.
   */
  test('traps Tab inside the panel and returns focus to the trigger on Escape', async ({ page }) => {
    await openPanel(page, 'name');

    const inPanel = () =>
      page.evaluate((sel) => !!document.activeElement?.closest(sel), PANEL);

    // Focus starts inside, on the search box.
    expect(await inPanel()).toBe(true);

    // Tab all the way round; focus must never leave the panel.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await inPanel()).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator(PANEL)).toHaveCount(0);

    const returned = await page.evaluate(
      (sel) => document.activeElement?.classList.contains('filter-trigger') ?? false,
      PANEL,
    );
    expect(returned).toBe(true);
  });

  /**
   * Asserted structurally in the unit suite (no `button.header-sort` inside the
   * filter row); this fires a real click and checks the sort did not move.
   */
  test('a click in the filter row never sorts the column', async ({ page }) => {
    const sortOf = () =>
      page.locator(`${FILTER_TABLE} thead tr:first-child th[data-column="name"]`).getAttribute('aria-sort');

    const before = await sortOf();
    await trigger(page, 'name').click();
    await expect(page.locator(PANEL)).toBeVisible();
    expect(await sortOf()).toBe(before);

    await page.keyboard.press('Escape');
    await expect(page.locator(PANEL)).toHaveCount(0);
    expect(await sortOf()).toBe(before);
  });

  /**
   * A `number` input reports `''` for any content that is not a valid number,
   * so binding the parsed operand back wiped the character just typed. `live()`
   * prevents the write — and only a real browser keeps the partial text visible
   * to observe it.
   */
  test('a partial number survives in the comparison operand box', async ({ page }) => {
    await openPanel(page, 'yearStarted');

    const operand = page.locator('.mp-overlay-pane .filter-operand');
    await operand.click();
    await operand.pressSequentially('19');
    await expect(operand).toHaveValue('19');

    // `-` alone is not a valid number; the box must still show what was typed.
    await operand.fill('');
    await operand.pressSequentially('-');
    const shown = await operand.evaluate((el: HTMLInputElement) => el.validity.badInput || el.value !== '');
    expect(shown).toBe(true);
  });

  test('the built-in value list filters the table and the trigger reports it', async ({ page }) => {
    await openPanel(page, 'name');

    const firstOption = page.locator('.mp-overlay-pane .filter-option').first();
    const chosen = (await firstOption.innerText()).trim();
    await firstOption.locator('input').check();

    // The demo owns the predicate, so this also proves the event crossed the
    // portal boundary and reached the page's handler.
    await expect(page.locator(`${FILTER_TABLE} tbody tr[data-row-key]`)).toHaveCount(1);
    await expect(trigger(page, 'name')).toHaveAttribute('aria-label', new RegExp(`filtered by ${chosen}`));
  });
});
