import { expect, Page, test } from '@playwright/test';

/**
 * FR-21 / FR-22 — Playwright smoke for the ribbon demo. Covers the
 * keyboard model + ARIA contract end-to-end in real browsers (Chromium +
 * Firefox via the workspace's playwright.config.ts projects).
 *
 * The ribbon renders in the light DOM (#437): the tab strip, panels and live
 * region are ordinary descendants of `.ribbon`, so role locators reach them.
 */

const ribbon = (page: Page) => page.locator('.ribbon').first();
const tab = (page: Page, label: string) => ribbon(page).getByRole('tab', { name: label, exact: true });
const focusedText = (page: Page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
const activeTabId = (page: Page) => ribbon(page).locator('[role="tab"][aria-selected="true"]').getAttribute('data-ribbon-tab');
const liveAnnouncement = (page: Page) => ribbon(page).locator('[aria-live="polite"]').innerText().then((text) => text.trim());
const isMinimized = (page: Page) => ribbon(page).evaluate((el) => el.hasAttribute('data-minimized'));
const keyTipCount = (page: Page) => ribbon(page).locator('.keytip-badge').count();

test.describe('ribbon demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enterprise/ribbon');
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });
    await expect(tab(page, 'Home')).toBeVisible();
  });

  test('boots into the Home tab by default', async ({ page }) => {
    expect(await activeTabId(page)).toBe('home');
  });

  test('arrow keys move focus across tabs; Enter activates', async ({ page }) => {
    await tab(page, 'Home').focus();
    await expect.poll(() => focusedText(page)).toBe('Home');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focusedText(page)).toBe('Insert');
    await page.keyboard.press('Enter');
    await expect.poll(() => activeTabId(page)).toBe('insert');
  });

  test('Ctrl+F1 toggles minimize/restore and announces via the live region', async ({ page }) => {
    await tab(page, 'Home').focus();
    await page.keyboard.press('Control+F1');
    await expect.poll(() => isMinimized(page)).toBe(true);
    await expect.poll(() => liveAnnouncement(page)).toMatch(/Ribbon minimized/i);
    await page.keyboard.press('Control+F1');
    await expect.poll(() => isMinimized(page)).toBe(false);
    await expect.poll(() => liveAnnouncement(page)).toMatch(/Ribbon restored/i);
  });

  test('"Select picture" reveals the Picture Tools contextual tab set + announces', async ({ page }) => {
    // The live announcer clears its message after 1.5s, so poll tightly after each toggle.
    await page.getByRole('button', { name: /Select picture/i }).click();
    await expect
      .poll(() => liveAnnouncement(page), { intervals: [50, 100, 150, 200] })
      .toMatch(/Picture Tools, contextual, now available/i);
    await expect(ribbon(page).locator('.ribbon-contextual-group-band')).toBeVisible();
    await expect(tab(page, 'Format')).toBeVisible();

    await page.getByRole('button', { name: /Deselect picture/i }).click();
    await expect
      .poll(() => liveAnnouncement(page), { intervals: [50, 100, 150, 200] })
      .toMatch(/Picture Tools, contextual, hidden/i);
    await expect(tab(page, 'Format')).toHaveCount(0);
  });

  test('Alt activates KeyTips overlay (tabs level), Esc closes it', async ({ page }) => {
    await tab(page, 'Home').focus();
    await page.keyboard.down('Alt');
    await page.keyboard.up('Alt');
    await expect.poll(() => keyTipCount(page)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect.poll(() => keyTipCount(page)).toBe(0);
  });

  test('Quick Access Toolbar exposes a role="toolbar" region with aria-label', async ({ page }) => {
    await expect(page.getByRole('toolbar', { name: 'Quick Access Toolbar' })).toBeVisible();
  });

  test('Simplified layout renders every item as a single row (FR-39)', async ({ page }) => {
    // Item sizes are derived in CSS from the layout: a large item stacks its
    // icon over its label (column); in Simplified every item is one row.
    const pasteDirection = () =>
      ribbon(page).locator('.ribbon-split-button-main').first().evaluate((el) => getComputedStyle(el).flexDirection);

    expect(await pasteDirection()).toBe('column');

    await page.getByRole('button', { name: /Switch to Simplified Layout/i }).click();
    await expect(ribbon(page)).toHaveAttribute('data-layout', 'simplified');
    await expect.poll(pasteDirection).toBe('row');

    await page.getByRole('button', { name: /Switch to Classic Layout/i }).click();
    await expect(ribbon(page)).toHaveAttribute('data-layout', 'classic');
    await expect.poll(pasteDirection).toBe('column');
  });

  test('Direction picker rtl flips the tab strip layout direction', async ({ page }) => {
    const dirField = page.locator('.control-field', { hasText: 'Direction' });
    await dirField.click();
    // bs-select renders a native select underneath; select by value on it.
    await dirField.locator('select').selectOption('rtl');
    // The change flows through Angular → signal update → attribute write: poll.
    await expect(page.locator('.ribbon-rtl-wrapper')).toHaveAttribute('dir', 'rtl');
  });
});
