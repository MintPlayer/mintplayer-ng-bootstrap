import { expect, test, type Page } from '@playwright/test';

/**
 * Issue #432 — loading <mp-card> must not change anything OUTSIDE a card.
 *
 * The React demo loads Bootstrap's full CSS, the setup closest to downstream
 * apps: Bootstrap's own `.text-bg-*` and `.card-*` rules are on the page, so
 * any document-level card rule that out-ranks them is a leak. The probes are
 * appended by the test; the demo page stays unchanged.
 */

const COOKIE = 'bs-theme-mode';

const WARNING = 'rgb(255, 193, 7)';
const DARK = 'rgb(33, 37, 41)';

const settle = async (page: Page) => {
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });
  await page.waitForFunction(() => !!customElements.get('mp-card') && !!document.querySelector('mp-card:defined'));
};

const appendProbes = (page: Page) =>
  page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML =
      '<span class="badge text-bg-warning" id="probe-badge">pending</span>' +
      '<div class="card" id="probe-card"><div class="card-header" id="probe-card-header">x</div>' +
      '<div class="card-body" id="probe-card-body">y</div></div>';
    document.body.appendChild(host);
    // A coloured header inside a real mp-card: the card's own colour contract.
    const header = document.createElement('div');
    header.className = 'card-header text-bg-dark';
    header.id = 'probe-mp-card-header';
    header.textContent = 'dark header';
    document.querySelector('mp-card')!.prepend(header);
  });

const computed = (page: Page, selector: string, property: string) =>
  page.locator(selector).evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);

for (const mode of ['light', 'dark'] as const) {
  test.describe(`card global styles (#432) — ${mode}`, () => {
    test.beforeEach(async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: COOKIE, value: mode, url: baseURL! }]);
      await page.goto('/basic/card');
      await settle(page);
      await expect(page.locator('html')).toHaveAttribute('data-bs-theme', mode);
      await appendProbes(page);
    });

    test('a page-level .badge.text-bg-warning keeps its background', async ({ page }) => {
      expect(await computed(page, '#probe-badge', 'background-color')).toBe(WARNING);
    });

    test('a text-bg header inside mp-card is opaque', async ({ page }) => {
      expect(await computed(page, '#probe-mp-card-header', 'background-color')).toBe(DARK);
    });

    test("a plain Bootstrap card outside mp-card keeps Bootstrap's own styling", async ({ page }) => {
      // Bootstrap: .card { --bs-card-cap-bg: rgba(var(--bs-body-color-rgb), 0.03) }
      const bodyColorRgb = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--bs-body-color-rgb').trim(),
      );
      expect(await computed(page, '#probe-card-header', 'background-color')).toBe(`rgba(${bodyColorRgb}, 0.03)`);
    });
  });
}
