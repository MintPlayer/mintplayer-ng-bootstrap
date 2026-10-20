import { expect, test, type Page } from '@playwright/test';

/**
 * Issue #432 — a card must not change anything OUTSIDE a card. Since #437 the
 * card is plain Bootstrap markup with no sheet of its own; the probes use the
 * classes the fronts emit (ui-core/card).
 *
 * The React demo loads Bootstrap's full CSS, the setup closest to downstream
 * apps: Bootstrap's own `.text-bg-*` and `.card-*` rules are on the page, so
 * any document-level card rule that out-ranks them is a leak. The probes are
 * appended by the test; the demo page stays unchanged.
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
  await page.locator('.card').first().waitFor();
};

const appendProbes = (page: Page) =>
  page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML =
      ['primary', 'secondary', 'success', 'info', 'warning', 'danger', 'light', 'dark']
        .map((name) => `<span class="badge text-bg-${name}" id="probe-badge-${name}">${name}</span>`)
        .join('') +
      '<div class="card text-bg-dark border-dark" id="probe-filled-card"><div class="card-body" id="probe-filled-body">' +
      '<div class="card-title" id="probe-filled-title">t</div>x</div></div>' +
      '<div class="card bg-transparent border-white" id="probe-outline-white">' +
      '<div class="card-body" id="probe-outline-white-body">x</div></div>' +
      '<div class="card" id="probe-card"><div class="card-header" id="probe-card-header">x</div>' +
      '<div class="card-body" id="probe-card-body">y</div></div>';
    document.body.appendChild(host);
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

    for (const [name, rgb] of Object.entries(THEME_COLORS)) {
      test(`a page-level .badge.text-bg-${name} keeps its background`, async ({ page }) => {
        expect(await computed(page, `#probe-badge-${name}`, 'background-color')).toBe(rgb);
      });
    }

    test('the body text of an outline-white card keeps the page colour', async ({ page }) => {
      // The outline variant is transparent, so it must not carry the filled white
      // variant's black text — else black on the dark page background (1.4:1).
      const pageColor = await page.evaluate(() => getComputedStyle(document.body).color);
      expect(await computed(page, '#probe-outline-white', 'color')).toBe(pageColor);
      expect(await computed(page, '#probe-outline-white-body', 'color')).toBe(pageColor);
    });

    test('the body text of a filled dark card follows its colour contract', async ({ page }) => {
      expect(await computed(page, '#probe-filled-card', 'background-color')).toBe(THEME_COLORS.dark);
      expect(await computed(page, '#probe-filled-body', 'color')).toBe(WHITE);
      expect(await computed(page, '#probe-filled-title', 'color')).toBe(WHITE);
    });

    test("a plain Bootstrap card keeps Bootstrap's own styling", async ({ page }) => {
      // Bootstrap: .card { --bs-card-cap-bg: rgba(var(--bs-body-color-rgb), 0.03) }
      const bodyColorRgb = await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--bs-body-color-rgb')
          .split(',')
          .map((channel) => channel.trim())
          .join(', '),
      );
      expect(await computed(page, '#probe-card-header', 'background-color')).toBe(`rgba(${bodyColorRgb}, 0.03)`);
    });
  });
}
