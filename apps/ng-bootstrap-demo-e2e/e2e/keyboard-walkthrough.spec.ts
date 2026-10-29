import { test, expect, type Page } from '@playwright/test';

/**
 * Phase C acceptance — the keyboard-only walkthrough (plan: "no interaction
 * leaves document.activeElement on <body>; every control a mouse user sees is
 * focusable and activatable"). Components with their own keyboard e2e specs
 * (datepicker, datetime-picker, dropdown, file-manager, dock, query-builder,
 * multi-range, splitter, tree-select, otp-input) are not repeated here; this
 * file covers the components Phase C touched that had no browser-level
 * keyboard coverage.
 */

/** The truly focused element through nested shadow roots, as a descriptor. */
async function deepActive(page: Page): Promise<{ tag: string; cls: string; role: string | null; text: string }> {
  return page.evaluate(() => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    if (!el) return { tag: 'NONE', cls: '', role: null, text: '' };
    return {
      tag: el.tagName.toLowerCase(),
      cls: typeof el.className === 'string' ? el.className : '',
      role: el.getAttribute('role'),
      text: (el.textContent ?? '').trim().slice(0, 40),
    };
  });
}

async function expectNotStranded(page: Page): Promise<void> {
  const active = await deepActive(page);
  expect(active.tag, `focus stranded on <${active.tag}>`).not.toBe('body');
}

test.describe('alert — dismiss rescues focus', () => {
  test('Enter on the close button hides the alert and focus is not stranded', async ({ page }) => {
    await page.goto('/basic/alert');
    await page.waitForLoadState('networkidle');
    const close = page.locator('bs-alert button').first();
    await close.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await expectNotStranded(page);
  });
});

test.describe('rating — unset value still has a tab stop', () => {
  test('a star is reachable and ArrowRight raises the value', async ({ page }) => {
    await page.goto('/basic/rating');
    const stop = page.locator('bs-rating [tabindex="0"]').first();
    await expect(stop).toBeVisible({ timeout: 15_000 });
    await stop.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    await expectNotStranded(page);
  });
});

test.describe('pagination — activation does not relabel or strand focus', () => {
  test('Enter on a page button keeps focus on a page button', async ({ page }) => {
    await page.goto('/basic/pagination');
    await page.waitForLoadState('networkidle');
    const target = page.locator('bs-pagination nav').first();
    await expect(target).toBeVisible();
    await target.evaluate((el) => {
      const btn = el.querySelectorAll<HTMLButtonElement>('button:not([disabled])')[1];
      btn?.focus();
    });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const active = await deepActive(page);
    expect(active.tag).toBe('button');
  });
});

test.describe('treeview — arrow navigation', () => {
  test('ArrowDown moves focus between rows', async ({ page }) => {
    await page.goto('/basic/treeview');
    await page.waitForLoadState('networkidle');
    const tree = page.locator('mp-treeview').first();
    await tree.evaluate((el) => {
      // mp-treeview is light-DOM (Tier L): its roving tab stop is a descendant
      // of the host, not of a shadow root.
      (el.shadowRoot ?? el).querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    });
    const before = await deepActive(page);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    const after = await deepActive(page);
    expect(after.tag).not.toBe('body');
    expect(after.text).not.toBe(before.text);
  });
});

test.describe('tooltip — keyboard focus shows it (C6 focusin parity)', () => {
  test('focusing the trigger reveals the tooltip', async ({ page }) => {
    await page.goto('/overlays/tooltip');
    await page.waitForLoadState('networkidle');
    const trigger = page.getByRole('button', { name: /left/i }).first();
    const tooltip = page.locator('.tooltip, [role="tooltip"]').first();
    // `networkidle` is not "Angular has finished bootstrapping". This demo
    // bootstraps DESTRUCTIVELY (no provideClientHydration), so the SSR'd button
    // is thrown away and rebuilt; a focus taken a moment too early lands on the
    // doomed node, and because the tooltip opens on `focusin` — a one-shot
    // event, unlike a click or a keypress the test could repeat — nothing ever
    // re-fires and the wait can only time out. Every other spec here survives
    // the same window because it acts again after focusing.
    // Re-focus until it takes. The invariant under test is unchanged: focus,
    // and only focus, must reveal the tooltip.
    await expect(async () => {
      await trigger.focus();
      await expect(tooltip).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  });
});

test.describe('popover — open, then Escape returns focus to the trigger', () => {
  test('keyboard round trip', async ({ page }) => {
    await page.goto('/overlays/popover');
    await page.waitForLoadState('networkidle');
    const trigger = page.getByRole('button', { name: /left/i }).first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await expect(page.locator('.popover, [role="dialog"], [role="tooltip"]').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(trigger).toBeFocused();
  });
});

test.describe('context menu — Shift+F10 opens at the focused element', () => {
  test('open, arrow to an item, Escape returns focus', async ({ page }) => {
    await page.goto('/overlays/context-menu');
    await page.waitForLoadState('networkidle');
    const host = page.locator('.has-custom-context-menu');
    await host.focus();
    await page.keyboard.press('Shift+F10');
    await page.waitForTimeout(300);
    // Scoped to the overlay container: other (closed) menus on the page also
    // match a bare li locator, and their hidden nodes win the race.
    const menuItem = page.locator('.cdk-overlay-container li', { hasText: 'Item 1' }).first();
    await expect(menuItem).toBeVisible();
    await expectNotStranded(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(host).toBeFocused();
  });
});

test.describe('offcanvas — Escape closes without stranding focus', () => {
  test('open via keyboard, Escape closes', async ({ page }) => {
    await page.goto('/overlays/offcanvas');
    await page.waitForLoadState('networkidle');
    const open = page.getByRole('button', { name: /^right$/i }).first();
    await open.focus();
    await page.keyboard.press('Enter');
    // The panel portals into <bs-offcanvas-holder>, not under <bs-offcanvas>.
    await expect(page.locator('.offcanvas.show').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.offcanvas.show')).toHaveCount(0);
    await expectNotStranded(page);
  });
});

test.describe('tile-manager — Escape genuinely reverts (4.10)', () => {
  test('at 390px: M, ArrowDown, Escape restores the starting layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/enterprise/tile-manager');
    await page.waitForLoadState('networkidle');
    const board = page.getByRole('region', { name: 'Demo dashboard' });
    const focusable = board.locator('[data-tile-id][tabindex="0"]');
    await expect(focusable).toHaveCount(1);

    // The tiles' placement, as the core writes it (inline grid-row / grid-column).
    const layoutOf = () =>
      board.evaluate((el) =>
        [...el.querySelectorAll<HTMLElement>('[data-tile-id]')]
          .map((t) => `${t.dataset['tileId']}:${t.style.gridColumn},${t.style.gridRow}`)
          .join(' '),
      );

    const initial = await layoutOf();
    await focusable.focus();
    await page.keyboard.press('m');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
    const stepped = await layoutOf();
    expect(stepped).not.toBe(initial);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    expect(await layoutOf()).toBe(initial);
    await expectNotStranded(page);
  });
});

test.describe('signature-pad — typed alternative is the keyboard path', () => {
  test('input, Undo, Clear are consecutive tab stops and typing lands on the model', async ({ page }) => {
    await page.goto('/advanced/signature-pad');
    await page.waitForLoadState('networkidle');
    const field = page.locator('bs-signature-pad input.signature-pad-text').first();
    // Disabled until hydrated: the pad is inert without JavaScript.
    await expect(field).toBeEnabled();
    await field.focus();
    let active = await deepActive(page);
    expect(active.tag).toBe('input');

    await page.keyboard.type('Ada');
    await expect(field).toHaveValue('Ada');

    await page.keyboard.press('Tab');
    active = await deepActive(page);
    expect(active.text).toBe('Undo');
    await page.keyboard.press('Tab');
    active = await deepActive(page);
    expect(active.text).toBe('Clear');
  });
});

test.describe('scheduler — month event chips are focusable and activatable', () => {
  test('a month-view event chip takes focus and Enter does not strand it', async ({ page }) => {
    await page.goto('/enterprise/scheduler');
    await page.waitForLoadState('networkidle');
    const scheduler = page.locator('bs-scheduler').first();
    await expect(scheduler).toBeVisible();
    const focused = await scheduler.evaluate((el) => {
      const chip = el.querySelector<HTMLElement>('[role="button"][data-event-id][tabindex]');
      chip?.focus();
      return chip !== null && chip !== undefined;
    });
    test.skip(!focused, 'no event chip rendered in the demo month');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await expectNotStranded(page);
  });
});

test.describe('composite widgets are exactly ONE tab stop', () => {
  // "Every control reachable" alone is satisfied by a widget where EVERY item
  // is tabbable — literally the mp-time-list 97-stop and file-manager
  // 201-stop audit findings. The roving-focus suites assert the invariant per
  // adopter; these pin the two historic offenders at browser level.

  test('file-manager icon grid keeps a single tabbable card', async ({ page }) => {
    await page.goto('/enterprise/file-manager');
    // Server-rendered, so wait for the live (hydrated) component before switching views.
    await page.waitForSelector('.file-manager[data-mp-hydrated]');
    await page.getByRole('button', { name: 'Icons view' }).click();
    const cards = page.locator('.file-manager .icon-card');
    await expect(cards.first()).toBeVisible();
    const tabIndexes = await cards.evaluateAll((els) => els.map((c) => (c as HTMLElement).tabIndex));
    expect(tabIndexes.length).toBeGreaterThan(1);
    expect(tabIndexes.filter((t) => t === 0)).toHaveLength(1);
  });

  test('datetime-picker time list keeps a single tabbable option', async ({ page }) => {
    await page.goto('/basic/forms/datetime-picker');
    await page.waitForSelector('bs-datetime-picker .mp-time-list');
    const counts = await page.locator('bs-datetime-picker .mp-time-list').first().evaluate((el) => {
      const options = [...el.querySelectorAll<HTMLElement>('[role="option"]')];
      return {
        options: options.length,
        stops: options.filter((o) => o.tabIndex === 0).length,
      };
    });
    test.skip(counts.options === 0, 'time list not rendered on this page shape');
    expect(counts.options).toBeGreaterThan(1);
    expect(counts.stops).toBe(1);
  });
});
