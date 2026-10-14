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
  await page.waitForFunction(() => !!customElements.get('mp-card') && !!document.querySelector('mp-card:defined'));
};

const appendProbes = (page: Page) =>
  page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML =
      ['primary', 'secondary', 'success', 'info', 'warning', 'danger', 'light', 'dark']
        .map((name) => `<span class="badge text-bg-${name}" id="probe-badge-${name}">${name}</span>`)
        .join('') +
      '<mp-card color="dark" id="probe-filled-card"><div class="card-body" id="probe-filled-body">' +
      '<div class="card-title" id="probe-filled-title">t</div>x</div></mp-card>' +
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

    for (const [name, rgb] of Object.entries(THEME_COLORS)) {
      test(`a page-level .badge.text-bg-${name} keeps its background`, async ({ page }) => {
        expect(await computed(page, `#probe-badge-${name}`, 'background-color')).toBe(rgb);
      });
    }

    test('the body text of a filled dark mp-card follows its colour contract', async ({ page }) => {
      // The regions read var(--mp-card-color); a variant that set only `color`
      // left them on the body colour — rgb(33, 37, 41) on rgb(33, 37, 41).
      expect(await computed(page, '#probe-filled-card', 'background-color')).toBe(THEME_COLORS.dark);
      expect(await computed(page, '#probe-filled-body', 'color')).toBe(WHITE);
      expect(await computed(page, '#probe-filled-title', 'color')).toBe(WHITE);
    });

    test('a text-bg header inside mp-card is opaque', async ({ page }) => {
      expect(await computed(page, '#probe-mp-card-header', 'background-color')).toBe(THEME_COLORS.dark);
    });

    test("a plain Bootstrap card outside mp-card keeps Bootstrap's own styling", async ({ page }) => {
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
