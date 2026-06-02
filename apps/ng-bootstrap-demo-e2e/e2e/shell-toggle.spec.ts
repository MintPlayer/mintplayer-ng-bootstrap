import { test, expect, type Page } from '@playwright/test';

// JS-enabled counterpart to shell-nojs.spec.ts. With scripting on, the demo wires
// the in-shell hamburger to the Auto/Show/Hide radios (the `statechange` event ->
// `[state]`) and vice-versa. These specs lock in the two bugs that were fixed:
//   1. the hamburger reports the *resolved visual* open state (not the raw, in
//      `auto`+wide inverted, checkbox), so the radios light up correctly; and
//   2. each hamburger click keeps flipping once an explicit `state` is set
//      (the Angular wrapper stops the raw WC event double-firing the binding).

const shellOf = (page: Page) => page.locator('mp-shell').first();
const hamburger = (page: Page) => shellOf(page).locator('label.shell-hamburger');
const sidebar = (page: Page) => shellOf(page).locator('aside.sidebar');
const checkedRadio = (page: Page) => page.locator('mp-radio[checked]');
// The toggle-button radios are Bootstrap `btn-check`: a visually-hidden <input>
// covered by a clickable <label class="btn">. Click the label, not the input.
const radio = (page: Page, name: string) =>
  page.locator('mp-radio').filter({ hasText: name }).locator('label.btn');

async function goto(page: Page) {
  await page.goto('/overlays/shell');
  await expect(shellOf(page)).toBeVisible();
  // Destructive (non-hydrating) SSR bootstrap + an async WC upgrade. Wait for a
  // deterministic readiness signal instead of `networkidle` (the dev server's
  // HMR socket keeps the network busy, which hangs `networkidle` on Firefox):
  // the `mp-shell` is upgraded (its imperative API exists and Lit has rendered
  // the in-shadow hamburger). The shadow renders *after* connectedCallback, by
  // which point Angular has already attached the `(statechange)` listener.
  await page.waitForFunction(() => {
    const s = document.querySelector('mp-shell') as (HTMLElement & { toggle?: unknown }) | null;
    return !!(s && typeof s.toggle === 'function' && s.shadowRoot?.querySelector('.shell-hamburger'));
  });
  await expect(page.locator('mp-radio[checked]')).toHaveCount(1);
}

test.describe('mp-shell toggle <-> radio sync (JS enabled)', () => {
  test('wide: starts open on Auto; hamburger alternates hide/show and lights the radio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await goto(page);

    // auto + wide => sidebar open, "Auto" selected.
    await expect(checkedRadio(page)).toHaveText('Auto');
    await expect(sidebar(page)).toBeInViewport();

    // Collapse via the hamburger -> closed + "Hide" lit.
    await hamburger(page).click();
    await expect(checkedRadio(page)).toHaveText('Hide');
    await expect(sidebar(page)).not.toBeInViewport();

    // Click again -> re-opens + "Show" lit (regression: used to no-op once an
    // explicit state was set).
    await hamburger(page).click();
    await expect(checkedRadio(page)).toHaveText('Show');
    await expect(sidebar(page)).toBeInViewport();

    // And once more, to prove it keeps alternating.
    await hamburger(page).click();
    await expect(checkedRadio(page)).toHaveText('Hide');
    await expect(sidebar(page)).not.toBeInViewport();
  });

  test('narrow: starts closed on Auto; hamburger alternates show/hide', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 900 });
    await goto(page);

    // auto + narrow => overlay drawer closed, "Auto" selected.
    await expect(checkedRadio(page)).toHaveText('Auto');
    await expect(sidebar(page)).not.toBeInViewport();

    await hamburger(page).click();
    await expect(checkedRadio(page)).toHaveText('Show');
    await expect(sidebar(page)).toBeInViewport();

    await hamburger(page).click();
    await expect(checkedRadio(page)).toHaveText('Hide');
    await expect(sidebar(page)).not.toBeInViewport();
  });

  test('radios drive the shell (the reverse direction)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await goto(page);

    await radio(page, 'Hide').click();
    await expect(sidebar(page)).not.toBeInViewport();

    await radio(page, 'Show').click();
    await expect(sidebar(page)).toBeInViewport();

    await radio(page, 'Auto').click();
    // back to the responsive default for this (wide) viewport: open.
    await expect(sidebar(page)).toBeInViewport();
  });
});
