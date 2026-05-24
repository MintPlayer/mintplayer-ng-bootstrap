import { test, expect, Page } from '@playwright/test';

/**
 * PRD `wc-aria-accessibility.md` §7.5 — Playwright smoke for dock pane move-mode.
 *
 * The dock's keyboard model:
 *   - Tab (or programmatic .focus) into a tab → press M → enter move mode.
 *   - In move mode: T / R / B / L docks the pane to the top / right / bottom /
 *     left of its stack; F floats; Escape cancels. Each transition is announced
 *     to the shadow-tree live region.
 *
 * Both axes (commit + cancel) are exercised below at a behavioural boundary —
 * we observe the layout JSON snapshot and the live-region text rather than
 * the dock's internal state — so the spec stays stable across implementation
 * tweaks of move-mode internals.
 */

/**
 * Walk into the dock manager's shadow root (and any nested shadow roots,
 * e.g. mp-tab-control's) to find the first element with role=tab matching
 * the requested pane name, and focus it.
 */
async function focusFirstTabForPane(page: Page, paneName: string): Promise<void> {
  await page.evaluate((pane) => {
    const dock = document.querySelector('mint-dock-manager');
    if (!dock?.shadowRoot) throw new Error('mint-dock-manager not mounted');

    // The dock tracks tab → pane mapping via .dock-tab[data-pane][data-tab-id]
    // in its own shadow root. The actual focusable tab button (role=tab) lives
    // inside a nested mp-tab-control shadow root with id `${tabId}-header-button`.
    const dockTab = dock.shadowRoot.querySelector<HTMLElement>(
      `.dock-tab[data-pane="${pane}"]`,
    );
    if (!dockTab) throw new Error(`no .dock-tab for pane ${pane}`);
    const tabId = dockTab.dataset['tabId'];
    if (!tabId) throw new Error(`pane ${pane} tab missing data-tab-id`);
    const buttonId = `${tabId}-header-button`;

    // Find the role=tab button anywhere reachable through nested shadow roots.
    const findTab = (root: ShadowRoot | Document): HTMLElement | null => {
      const direct = root.querySelector<HTMLElement>(`[role="tab"]#${CSS.escape(buttonId)}`);
      if (direct) return direct;
      // Recurse into elements that host their own shadow root.
      for (const el of root.querySelectorAll<HTMLElement>('*')) {
        if (el.shadowRoot) {
          const found = findTab(el.shadowRoot);
          if (found) return found;
        }
      }
      return null;
    };
    const tab = findTab(dock.shadowRoot);
    if (!tab) throw new Error(`role=tab button #${buttonId} not found`);
    tab.focus();
  }, paneName);
}

/**
 * Read whatever the dock's live announcer last said. The live region lives
 * at role=status inside the dock's shadow root.
 */
async function readLiveAnnouncement(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const dock = document.querySelector('mint-dock-manager');
    return dock?.shadowRoot?.querySelector('[role="status"]')?.textContent ?? '';
  });
}

/**
 * Read the dock's keyboard-mode state for cancel-path assertion. Kept
 * private to the spec so we don't leak test-only API.
 */
async function isInMoveMode(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const dock = document.querySelector('mint-dock-manager') as
      | (HTMLElement & { paneMoveMode?: unknown })
      | null;
    return !!(dock as unknown as { paneMoveMode: unknown }).paneMoveMode;
  });
}

/** Capture the live layout JSON shown on the demo page.
 *
 * The Live layout pane is rendered conditionally: the `<bs-code-snippet>`
 * only appears once `liveLayout()` populates (after the first
 * layoutSnapshotChange). Before that, the demo shows a placeholder
 * paragraph. Use a synchronous page.evaluate so the assertion can read
 * "empty before, populated after" without waiting on a locator timeout.
 *
 * Reads the `.code` property off the inner `<mp-code-snippet>` — that's
 * the source JSON the Angular wrapper forwards via `[codeToCopy]`.
 */
async function readLiveLayout(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const liveSnap = Array.from(document.querySelectorAll('.dock-demo__snapshot')).find(
      (d) => d.querySelector('.dock-demo__snapshot-title')?.textContent?.includes('Live layout'),
    );
    const snippet = liveSnap?.querySelector('mp-code-snippet') as
      | (HTMLElement & { code?: string })
      | null;
    return snippet?.code ?? '';
  });
}

test.describe('mint-dock-manager — keyboard pane move-mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enterprise/dock');
    // Demo SSR uses destructive bootstrap; the WC needs networkidle to settle
    // before its shadow tree is populated (see memory project_e2e_destructive_bootstrap).
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Panel 1' })).toBeVisible();
  });

  test('M → T docks the focused pane to top, announces, and mutates the layout', async ({ page }) => {
    const before = await readLiveLayout(page);

    await focusFirstTabForPane(page, 'panel-2');
    await page.keyboard.press('m');

    // Live region narrates entry.
    await expect
      .poll(() => readLiveAnnouncement(page))
      .toMatch(/Move mode for pane/i);
    expect(await isInMoveMode(page)).toBe(true);

    await page.keyboard.press('t');

    // Commit announcement + paneMoveMode cleared + layout actually changed.
    await expect
      .poll(() => readLiveAnnouncement(page))
      .toMatch(/docked to top/i);
    expect(await isInMoveMode(page)).toBe(false);

    const after = await readLiveLayout(page);
    expect(after).not.toBe(before);
  });

  test('M → Escape cancels move-mode, announces, leaves layout untouched', async ({ page }) => {
    const before = await readLiveLayout(page);

    await focusFirstTabForPane(page, 'panel-3');
    await page.keyboard.press('m');
    await expect.poll(() => isInMoveMode(page)).toBe(true);

    await page.keyboard.press('Escape');

    await expect
      .poll(() => readLiveAnnouncement(page))
      .toMatch(/Move cancelled/i);
    expect(await isInMoveMode(page)).toBe(false);

    const after = await readLiveLayout(page);
    expect(after).toBe(before);
  });

  test('M on a focused tab does NOT fire when focus is elsewhere (e.g. body)', async ({ page }) => {
    // Sanity: pressing M with no focused tab must not enter move mode. This
    // protects against the keymap leaking into other pages or input surfaces.
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('m');
    expect(await isInMoveMode(page)).toBe(false);
  });
});
