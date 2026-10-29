import { test, expect, Page } from '@playwright/test';

/**
 * PRD `wc-aria-accessibility.md` §7.5 — Playwright smoke for dock pane move-mode.
 *
 * The dock's keyboard model:
 *   - Focus a tab → press M → enter move mode.
 *   - In move mode: T / R / B / L docks the pane to the top / right / bottom /
 *     left of its stack; F floats; Escape cancels. Each transition is announced
 *     to the dock's live region.
 *
 * Both axes (commit + cancel) are exercised at a behavioural boundary — the
 * layout JSON snapshot and the live-region text — so the spec stays stable
 * across implementation tweaks of move-mode internals. The dock renders in the
 * light DOM (#437), so its tabs are ordinary role=tab buttons.
 */

const dock = (page: Page) => page.locator('bs-dock-manager');
const tab = (page: Page, name: string) => dock(page).getByRole('tab', { name, exact: true });

/** Whatever the dock's live announcer last said. */
async function readLiveAnnouncement(page: Page): Promise<string> {
  return (await dock(page).locator('[role="status"]').textContent()) ?? '';
}

/**
 * The live layout JSON shown on the demo page. The snippet only appears once
 * the dock first writes its layout back; before that the demo shows a
 * placeholder, which reads as the empty string here.
 */
async function readLiveLayout(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const liveSnap = Array.from(document.querySelectorAll('.dock-demo__snapshot')).find(
      (d) => d.querySelector('.dock-demo__snapshot-title')?.textContent?.includes('Live layout'),
    );
    const rows = liveSnap?.querySelectorAll('bs-code-snippet .line-text') ?? [];
    return Array.from(rows, (row) => row.textContent ?? '').join('\n');
  });
}

test.describe('bs-dock-manager — keyboard pane move-mode', () => {
  /*
   * Wait for an enabled tab, not for the network: the dev server holds an HMR
   * websocket open, so the network never idles. Tabs render disabled on the
   * server and enable once the core is live on the client.
   */
  test.beforeEach(async ({ page }) => {
    await page.goto('/enterprise/dock');
    await expect(tab(page, 'Panel 2')).toBeEnabled();
  });

  test('M → T docks the focused pane to top, announces, and mutates the layout', async ({ page }) => {
    const before = await readLiveLayout(page);

    await tab(page, 'Panel 2').focus();
    await page.keyboard.press('m');
    await expect.poll(() => readLiveAnnouncement(page)).toMatch(/Move mode for pane/i);

    await page.keyboard.press('t');
    await expect.poll(() => readLiveAnnouncement(page)).toMatch(/docked to top/i);
    await expect.poll(() => readLiveLayout(page)).not.toBe(before);
  });

  test('M → Escape cancels move-mode, announces, leaves layout untouched', async ({ page }) => {
    const before = await readLiveLayout(page);

    await tab(page, 'Panel 3').focus();
    await page.keyboard.press('m');
    await expect.poll(() => readLiveAnnouncement(page)).toMatch(/Move mode for pane/i);

    await page.keyboard.press('Escape');
    await expect.poll(() => readLiveAnnouncement(page)).toMatch(/Move cancelled/i);

    // Move mode is gone: a command letter now does nothing.
    await page.keyboard.press('t');
    expect(await readLiveLayout(page)).toBe(before);
  });

  test('M does NOT arm move mode when focus is elsewhere (e.g. body)', async ({ page }) => {
    // Protects against the keymap leaking into other pages or input surfaces.
    const before = await readLiveLayout(page);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('m');
    await page.keyboard.press('t');
    expect(await readLiveAnnouncement(page)).not.toMatch(/Move mode/i);
    expect(await readLiveLayout(page)).toBe(before);
  });
});
