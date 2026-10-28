import { test, expect, Page } from '@playwright/test';

/**
 * `bs-splitter` — APG Window Splitter
 * keyboard resize on the "Sizing & events" example, asserted at behavioural
 * boundaries: the slotted pane's actual width, the divider's
 * `aria-valuenow`, and the `resizeend` output (the demo page prints it as
 * "Last event: resizeEnd → …").
 */

const PATH = '/enterprise/splitter';

// The sized example: a 2-pane splitter inside .dock-small.
const splitter = (page: Page) => page.locator('.dock-small .splitter');
// The first panel's divider is hidden: the visible one belongs to the second panel.
const divider = (page: Page) => splitter(page).locator('> .splitter-panel:nth-child(2) > .splitter-divider');
const leftPane = (page: Page) => splitter(page).locator('> .splitter-panel > .splitter-pane').first();

async function goto(page: Page) {
  await page.goto(PATH);
  // Deterministic readiness: the splitter measured and described its divider.
  await expect(divider(page)).toHaveAttribute('aria-valuenow', /^\d+$/);
  await divider(page).scrollIntoViewIfNeeded();
}

test.describe('splitter', () => {
  test('divider exposes the APG separator contract', async ({ page }) => {
    await goto(page);
    const div = divider(page);
    await expect(div).toHaveAttribute('role', 'separator');
    await expect(div).toHaveAttribute('aria-orientation', 'vertical');
    await expect(div).toHaveAttribute('tabindex', '0');
    await expect(div).toHaveAttribute('aria-valuenow', /^\d+$/);
    await expect(div).toHaveAttribute('aria-controls', /-pane .*-pane$/);
  });

  test('keyboard resize moves the divider and emits resizeend', async ({ page }) => {
    await goto(page);
    const div = divider(page);

    const before = (await leftPane(page).boundingBox())!;
    const containerWidth = (await splitter(page).boundingBox())!.width;
    const valueBefore = Number(await div.getAttribute('aria-valuenow'));

    await div.focus();
    await page.keyboard.press('ArrowRight');

    // ~10% of the container moved from the right pane into the left one.
    await expect
      .poll(async () => (await leftPane(page).boundingBox())!.width)
      .toBeGreaterThan(before.width + containerWidth * 0.05);
    await expect
      .poll(async () => Number(await div.getAttribute('aria-valuenow')))
      .toBeGreaterThan(valueBefore);

    // The page renders the resizeend detail sizes.
    await expect(page.locator('p', { hasText: 'Last event:' }))
      .toContainText(/resizeEnd → \d+ \/ \d+/);
  });

  test('Home clamps the leading pane to min-panel-size', async ({ page }) => {
    await goto(page);
    const div = divider(page);

    await div.focus();
    await page.keyboard.press('Home');

    // The demo sets [minPanelSize]="120".
    await expect
      .poll(async () => Math.round((await leftPane(page).boundingBox())!.width))
      .toBeLessThanOrEqual(121);

    await page.keyboard.press('End');
    const containerWidth = (await splitter(page).boundingBox())!.width;
    await expect
      .poll(async () => (await leftPane(page).boundingBox())!.width)
      .toBeGreaterThan(containerWidth / 2);
  });
});
