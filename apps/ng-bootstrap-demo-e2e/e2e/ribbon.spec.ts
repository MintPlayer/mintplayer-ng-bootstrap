import { expect, Page, test } from '@playwright/test';

/**
 * FR-21 / FR-22 — Playwright smoke for the ribbon demo. Covers the
 * keyboard model + ARIA contract end-to-end in real browsers (Chromium +
 * Firefox via the workspace's playwright.config.ts projects).
 *
 * Demo SSR uses destructive bootstrap; the WC needs `networkidle` to
 * settle before its shadow tree is populated (see memory
 * `project_e2e_destructive_bootstrap`).
 */

/**
 * The role=tab buttons live inside mp-ribbon's shadow root. Playwright's
 * default selectors don't pierce closed-ish shadow roots reliably across
 * browsers when the host is a custom element, so we resolve through the
 * shadow root explicitly via page.evaluate.
 */
async function focusTabByLabel(page: Page, label: string): Promise<void> {
  await page.evaluate((wanted) => {
    const ribbon = document.querySelector('mp-ribbon');
    if (!ribbon?.shadowRoot) throw new Error('mp-ribbon not mounted');
    const tab = Array.from(
      ribbon.shadowRoot.querySelectorAll<HTMLElement>('[role="tab"]')
    ).find((b) => (b.textContent ?? '').trim() === wanted);
    if (!tab) throw new Error(`tab "${wanted}" not found`);
    tab.focus();
  }, label);
}

async function readActiveTabId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const ribbon = document.querySelector('mp-ribbon');
    return ribbon?.getAttribute('active-tab-id') ?? null;
  });
}

async function readLiveAnnouncement(page: Page): Promise<string> {
  return page.evaluate(() => {
    const ribbon = document.querySelector('mp-ribbon');
    return ribbon?.shadowRoot?.querySelector('[aria-live="polite"]')?.textContent?.trim() ?? '';
  });
}

async function isMinimized(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const ribbon = document.querySelector('mp-ribbon');
    return ribbon?.hasAttribute('minimized') ?? false;
  });
}

async function keyTipMode(page: Page): Promise<string> {
  return page.evaluate(() => {
    const ribbon = document.querySelector('mp-ribbon') as
      | (HTMLElement & { keyTipMode?: string })
      | null;
    return ribbon?.keyTipMode ?? 'off';
  });
}

test.describe('ribbon demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advanced/ribbon');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(
      () => !!document.querySelector('mp-ribbon')?.shadowRoot?.querySelector('[role="tab"]')
    );
  });

  test('boots into the Home tab by default', async ({ page }) => {
    expect(await readActiveTabId(page)).toBe('home');
  });

  test('arrow keys move focus across tabs; Enter activates', async ({ page }) => {
    await focusTabByLabel(page, 'Home');
    // Confirm focus actually landed on the Home tab before we press anything
    // — Firefox occasionally takes an extra frame to honour element.focus()
    // through shadow DOM. Without this poll the next keydown can race into
    // the body and never reach the ribbon's tab strip handler.
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            document
              .querySelector('mp-ribbon')
              ?.shadowRoot?.activeElement?.textContent?.trim() ?? ''
        )
      )
      .toBe('Home');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            document
              .querySelector('mp-ribbon')
              ?.shadowRoot?.activeElement?.textContent?.trim() ?? ''
        )
      )
      .toBe('Insert');
    await page.keyboard.press('Enter');
    await expect.poll(() => readActiveTabId(page)).toBe('insert');
  });

  test('Ctrl+F1 toggles minimize/restore and announces via the live region', async ({ page }) => {
    await focusTabByLabel(page, 'Home');
    await page.keyboard.press('Control+F1');
    await expect.poll(() => isMinimized(page)).toBe(true);
    await expect.poll(() => readLiveAnnouncement(page)).toMatch(/Ribbon minimized/i);
    await page.keyboard.press('Control+F1');
    await expect.poll(() => isMinimized(page)).toBe(false);
    await expect.poll(() => readLiveAnnouncement(page)).toMatch(/Ribbon restored/i);
  });

  test('"Select picture" reveals the Picture Tools contextual tab set + announces', async ({ page }) => {
    // The live announcer clears its message after 1.5s, so we have to poll
    // tightly after each toggle to catch the announcement before it blanks.
    // Polling starts immediately (no intermediate `waitForFunction`).
    await page.getByRole('button', { name: /Select picture/i }).click();
    await expect
      .poll(() => readLiveAnnouncement(page), { intervals: [50, 100, 150, 200] })
      .toMatch(/Picture Tools, contextual, now available/i);
    // Sanity: the band is also actually rendered.
    expect(
      await page.evaluate(
        () =>
          !!document
            .querySelector('mp-ribbon')
            ?.shadowRoot?.querySelector('.ribbon-contextual-group-band')
      )
    ).toBe(true);

    await page.getByRole('button', { name: /Deselect picture/i }).click();
    await expect
      .poll(() => readLiveAnnouncement(page), { intervals: [50, 100, 150, 200] })
      .toMatch(/Picture Tools, contextual, hidden/i);
  });

  test('Alt activates KeyTips overlay (tabs level), Esc closes it', async ({ page }) => {
    // Click into the ribbon body so the document focus is inside its subtree.
    await focusTabByLabel(page, 'Home');
    await page.keyboard.down('Alt');
    await page.keyboard.up('Alt');
    await expect.poll(() => keyTipMode(page)).toBe('tabs');
    await page.keyboard.press('Escape');
    await expect.poll(() => keyTipMode(page)).toBe('off');
  });

  test('Quick Access Toolbar exposes a role="toolbar" region with aria-label', async ({ page }) => {
    const role = await page.evaluate(() => {
      const qat = document.querySelector('mp-quick-access-toolbar');
      return {
        role: qat?.getAttribute('role'),
        label: qat?.getAttribute('aria-label'),
      };
    });
    expect(role.role).toBe('toolbar');
    expect(role.label).toBe('Quick Access Toolbar');
  });

  test('Simplified layout toggles + stamps data-ribbon-layout on descendants (FR-39)', async ({ page }) => {
    // The demo's "Switch to Simplified Layout" / "Switch to Classic Layout"
    // button drives mp-ribbon's `layout` property.
    await page.getByRole('button', { name: /Switch to Simplified Layout/i }).click();

    // The mp-ribbon's host attribute should reflect the new layout.
    await expect
      .poll(() =>
        page.evaluate(() => document.querySelector('mp-ribbon')?.getAttribute('layout'))
      )
      .toBe('simplified');

    // Every group gets the data-ribbon-layout stamp so its shadow-DOM CSS
    // can switch to the flat horizontal rendering.
    const stampedCount = await page.evaluate(() => {
      const groups = document.querySelectorAll(
        'mp-ribbon-group[data-ribbon-layout="simplified"]'
      );
      return groups.length;
    });
    expect(stampedCount).toBeGreaterThan(0);

    // Items get forced to size=small in Simplified.
    const allItemsSmall = await page.evaluate(() => {
      const items = document.querySelectorAll('mp-ribbon-button');
      return Array.from(items).every((i) => i.getAttribute('size') === 'small');
    });
    expect(allItemsSmall).toBe(true);

    // Switch back. The original sizes should be restored.
    await page.getByRole('button', { name: /Switch to Classic Layout/i }).click();
    await expect
      .poll(() =>
        page.evaluate(() => document.querySelector('mp-ribbon')?.getAttribute('layout'))
      )
      .toBe('classic');

    const someItemNotSmall = await page.evaluate(() => {
      const items = document.querySelectorAll('mp-ribbon-button');
      return Array.from(items).some((i) => i.getAttribute('size') !== 'small');
    });
    expect(someItemNotSmall).toBe(true);
  });

  test('Direction picker rtl flips the tab strip layout direction', async ({ page }) => {
    // Pick "rtl" in the Direction <bs-select>.
    const dirField = page.locator('.control-field', { hasText: 'Direction' });
    await dirField.click();
    // bs-select renders a native select underneath; the easiest cross-browser
    // path is to select by value on the underlying <select>.
    await dirField.locator('select').selectOption('rtl');
    // The <select>'s change event flows through Angular → signal update → DOM
    // attribute write on `.ribbon-rtl-wrapper`. Reading the attribute in the
    // same tick races that update, so poll until it propagates.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.querySelector<HTMLElement>('.ribbon-rtl-wrapper')?.getAttribute('dir') ?? null
        )
      )
      .toBe('rtl');
  });
});
