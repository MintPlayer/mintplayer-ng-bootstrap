import { expect, test, type Page } from '@playwright/test';

/**
 * Issue #432 — loading <mp-card> must not change anything OUTSIDE a card.
 *
 * The card used to append an unscoped sheet to document.head whose
 * `.text-bg-*` rules carried `RGBA(#hex, var(--bs-bg-opacity, 1)) !important`
 * — invalid at computed-value time, so `background-color` fell back to
 * transparent for every `.text-bg-*` on the page, card or not. Its unscoped
 * `.card-*` rules also restyled every plain Bootstrap card.
 *
 * jsdom cannot compute a var()-dependent invalid value, so this is asserted in
 * a real engine, in light and dark mode. The probes are appended by the test,
 * outside any card, so the demo page itself stays unchanged.
 *
 * A plain span is used on purpose: <bs-badge> renders `bg-*`, not `text-bg-*`.
 */

const COOKIE = 'bs-theme-mode';

// Bootstrap 5.3 theme colours; --bs-*-rgb is identical in light and dark mode.
const WARNING = 'rgb(255, 193, 7)';
const DARK = 'rgb(33, 37, 41)';
const SUCCESS = 'rgb(25, 135, 84)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

const settle = async (page: Page) => {
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });
  // The card installs its document-level sheet from connectedCallback, so an
  // upgraded mp-card means the sheet is in place.
  await page.waitForFunction(() => !!customElements.get('mp-card') && !!document.querySelector('mp-card:defined'));
};

const appendProbes = (page: Page) =>
  page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'issue-432-probes';
    host.innerHTML =
      '<span class="badge text-bg-warning" id="probe-badge">pending</span>' +
      '<div class="card" id="probe-card"><div class="card-header" id="probe-card-header">x</div>' +
      '<div class="card-body" id="probe-card-body"><div class="card-title" id="probe-card-title">t</div></div></div>';
    document.body.appendChild(host);
  });

const computed = (page: Page, selector: string, property: string) =>
  page.locator(selector).first().evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);

for (const mode of ['light', 'dark'] as const) {
  test.describe(`card global styles (#432) — ${mode}`, () => {
    test.beforeEach(async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: COOKIE, value: mode, url: baseURL! }]);
      await page.goto('/basic/containers/card');
      await settle(page);
      await expect(page.locator('html')).toHaveAttribute('data-bs-theme', mode);
      await appendProbes(page);
    });

    test('a page-level .badge.text-bg-warning keeps its background', async ({ page }) => {
      expect(await computed(page, '#probe-badge', 'background-color')).toBe(WARNING);
    });

    test('card header/footer colours inside mp-card are opaque', async ({ page }) => {
      expect(await computed(page, 'demo-card mp-card .text-bg-dark', 'background-color')).toBe(DARK);
      expect(await computed(page, 'demo-card mp-card .text-bg-success', 'background-color')).toBe(SUCCESS);
    });

    test('a plain Bootstrap card outside mp-card is not restyled by the card sheet', async ({ page }) => {
      // The Angular demo does not ship Bootstrap's card partial globally
      // (libs/mintplayer-ng-bootstrap/_bootstrap.scss), so a plain .card-* is
      // an unstyled block: anything else came from the card's sheet.
      expect(await computed(page, '#probe-card-header', 'background-color')).toBe(TRANSPARENT);
      expect(await computed(page, '#probe-card-header', 'padding-top')).toBe('0px');
      expect(await computed(page, '#probe-card-body', 'padding-top')).toBe('0px');
      expect(await computed(page, '#probe-card-title', 'margin-bottom')).toBe('0px');
    });
  });
}
