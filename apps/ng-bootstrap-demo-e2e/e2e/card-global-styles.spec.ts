import { expect, test, type Page } from '@playwright/test';

/**
 * Issue #432 — a card must not change anything OUTSIDE a card.
 *
 * The card used to append an unscoped sheet to document.head whose
 * `.text-bg-*` rules carried `RGBA(#hex, var(--bs-bg-opacity, 1)) !important`
 * — invalid at computed-value time, so `background-color` fell back to
 * transparent for every `.text-bg-*` on the page, card or not. Since #437 the
 * card ships no sheet at all: every front renders plain Bootstrap markup and
 * the layered baseline styles it. This keeps the guard, and asserts that the
 * classes the fronts emit (ui-core/card) produce the colour contract.
 *
 * jsdom cannot compute a var()-dependent invalid value, so this is asserted in
 * a real engine, in light and dark mode. The probes are appended by the test,
 * so the demo page itself stays unchanged.
 */

const COOKIE = 'bs-theme-mode';

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

const settle = async (page: Page) => {
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
    /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
  });
  await page.locator('bs-card.card').first().waitFor();
};

const appendProbes = (page: Page) =>
  page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'issue-432-probes';
    host.innerHTML =
      ['primary', 'secondary', 'success', 'info', 'warning', 'danger', 'light', 'dark']
        .map((name) => `<span class="badge text-bg-${name}" id="probe-badge-${name}">${name}</span>`)
        .join('') +
      '<div class="card text-bg-dark border-dark" id="probe-filled-card"><div class="card-body" id="probe-filled-body">' +
      '<div class="card-title" id="probe-filled-title">t</div>x</div></div>' +
      '<div class="card bg-transparent border-white" id="probe-outline-white">' +
      '<div class="card-body" id="probe-outline-white-body">x</div></div>';
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

    test('the body text of an outline-white card keeps the page colour', async ({ page }) => {
      // The outline variant is transparent, so it must not carry the filled
      // white text-black — else black on the dark page background (1.4:1).
      const pageColor = await page.evaluate(() => getComputedStyle(document.body).color);
      expect(await computed(page, '#probe-outline-white', 'color')).toBe(pageColor);
      expect(await computed(page, '#probe-outline-white-body', 'color')).toBe(pageColor);
    });

    test('the body text of a filled dark card follows its colour', async ({ page }) => {
      expect(await computed(page, '#probe-filled-card', 'background-color')).toBe(THEME_COLORS.dark);
      expect(await computed(page, '#probe-filled-body', 'color')).toBe(WHITE);
      expect(await computed(page, '#probe-filled-title', 'color')).toBe(WHITE);
    });

    test('card header/footer colours in the demo are opaque', async ({ page }) => {
      expect(await computed(page, 'bs-card .card-header.text-bg-dark', 'background-color')).toBe(THEME_COLORS.dark);
      expect(await computed(page, 'bs-card .card-footer.text-bg-success', 'background-color')).toBe(THEME_COLORS.success);
    });

    test('the baseline styles a bs-card as a Bootstrap card', async ({ page }) => {
      // The card partial ships in the layered baseline (#437 M1), so the
      // Angular card is Bootstrap's card with no component sheet of its own.
      expect(await computed(page, 'bs-card.card', 'display')).toBe('flex');
      expect(await computed(page, 'bs-card .card-body', 'padding-top')).not.toBe('0px');
    });
  });
}
