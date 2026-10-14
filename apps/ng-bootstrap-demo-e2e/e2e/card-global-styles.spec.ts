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
// Bootstrap 5.3 --bs-<name>-rgb; [data-bs-theme=dark] does not redefine these.
const THEME_COLORS: Record<string, string> = {
  primary: 'rgb(13, 110, 253)',
  secondary: 'rgb(108, 117, 125)',
  success: 'rgb(25, 135, 84)',
  info: 'rgb(13, 202, 240)',
  warning: 'rgb(255, 193, 7)',
  danger: 'rgb(220, 53, 69)',
  light: 'rgb(248, 249, 250)',
  dark: 'rgb(33, 37, 41)',
};
const WHITE = 'rgb(255, 255, 255)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

const settle = async (page: Page) => {
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });
  // The card installs its document-level sheet at module load, before define,
  // so an upgraded mp-card means the sheet is in place.
  await page.waitForFunction(() => !!customElements.get('mp-card') && !!document.querySelector('mp-card:defined'));
};

const appendProbes = (page: Page) =>
  page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'issue-432-probes';
    host.innerHTML =
      ['primary', 'secondary', 'success', 'info', 'warning', 'danger', 'light', 'dark']
        .map((name) => `<span class="badge text-bg-${name}" id="probe-badge-${name}">${name}</span>`)
        .join('') +
      '<mp-card color="dark" id="probe-filled-card"><div class="card-body" id="probe-filled-body">' +
      '<div class="card-title" id="probe-filled-title">t</div>x</div></mp-card>' +
      '<mp-card color="white" outline id="probe-outline-white">' +
      '<div class="card-body" id="probe-outline-white-body">x</div></mp-card>' +
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

    for (const [name, rgb] of Object.entries(THEME_COLORS)) {
      test(`a page-level .badge.text-bg-${name} keeps its background`, async ({ page }) => {
        expect(await computed(page, `#probe-badge-${name}`, 'background-color')).toBe(rgb);
      });
    }

    test('the body text of an outline-white mp-card keeps the page colour', async ({ page }) => {
      // The outline variant is transparent, so it must undo the filled white
      // rule's black text — else black on the dark page background (1.4:1).
      const pageColor = await page.evaluate(() => getComputedStyle(document.body).color);
      expect(await computed(page, '#probe-outline-white', 'color')).toBe(pageColor);
      expect(await computed(page, '#probe-outline-white-body', 'color')).toBe(pageColor);
    });

    test('the body text of a filled dark mp-card follows its colour contract', async ({ page }) => {
      // The regions read var(--mp-card-color); a variant that set only `color`
      // left them on the body colour — rgb(33, 37, 41) on rgb(33, 37, 41).
      expect(await computed(page, '#probe-filled-card', 'background-color')).toBe(THEME_COLORS.dark);
      expect(await computed(page, '#probe-filled-body', 'color')).toBe(WHITE);
      expect(await computed(page, '#probe-filled-title', 'color')).toBe(WHITE);
    });

    test('card header/footer colours inside mp-card are opaque', async ({ page }) => {
      expect(await computed(page, 'demo-card mp-card .text-bg-dark', 'background-color')).toBe(THEME_COLORS.dark);
      expect(await computed(page, 'demo-card mp-card .text-bg-success', 'background-color')).toBe(THEME_COLORS.success);
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
