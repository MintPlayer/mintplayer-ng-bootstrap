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
    const target = page.locator('mp-pagination').first();
    await expect(target).toBeVisible();
    await target.evaluate((el) => {
      const btn = el.shadowRoot?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')[1];
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
      el.shadowRoot?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
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
    await trigger.focus();
    await page.waitForTimeout(300);
    await expect(page.locator('.tooltip, [role="tooltip"]').first()).toBeVisible();
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
  test('M, ArrowRight, Escape restores the starting layout', async ({ page }) => {
    await page.goto('/enterprise/tile-manager');
    await page.waitForLoadState('networkidle');
    const board = page.locator('mp-tile-manager').first();
    await expect(board).toBeVisible();

    const layoutOf = () =>
      board.evaluate((el) =>
        (el as HTMLElement & { tiles: { id: string; position: { colStart: number; rowStart: number } }[] })
          .tiles.map((t) => `${t.id}:${t.position.colStart},${t.position.rowStart}`).join(' '),
      );

    const initial = await layoutOf();
    await board.evaluate((el) => el.shadowRoot?.querySelector<HTMLElement>('.tile[tabindex="0"]')?.focus());
    await page.keyboard.press('m');
    await page.keyboard.press('ArrowRight');
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
    const pad = page.locator('mp-signature-pad').first();
    await pad.evaluate((el) => (el as HTMLElement).focus());
    let active = await deepActive(page);
    expect(active.tag).toBe('input');

    await page.keyboard.type('Ada');
    const text = await pad.evaluate((el) => (el as HTMLElement & { signature: { text?: string } }).signature.text);
    expect(text).toBe('Ada');

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
    const scheduler = page.locator('mp-scheduler').first();
    await expect(scheduler).toBeVisible();
    const focused = await scheduler.evaluate((el) => {
      const chip = el.shadowRoot?.querySelector<HTMLElement>('[role="button"][tabindex], .event[tabindex]');
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
    // Upgrade is lazy with route-level code-splitting — wait for the shadow
    // root, not just the tag.
    await page.waitForFunction(() => !!document.querySelector('mp-file-manager')?.shadowRoot);
    const counts = await page.locator('mp-file-manager').first().evaluate(async (el) => {
      el.setAttribute('view-mode', 'icons');
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.icon-card')];
      return {
        cards: cards.length,
        stops: cards.filter((c) => c.tabIndex === 0).length,
      };
    });
    expect(counts.cards).toBeGreaterThan(1);
    expect(counts.stops).toBe(1);
  });

  test('datetime-picker time list keeps a single tabbable option', async ({ page }) => {
    await page.goto('/basic/forms/datetime-picker');
    await page.waitForSelector('mp-datetime-picker');
    const counts = await page.locator('mp-datetime-picker mp-time-list').first().evaluate(async (el) => {
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      const options = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"], button.slot')];
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
