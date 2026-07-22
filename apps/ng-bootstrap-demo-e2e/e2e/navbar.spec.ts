import { test, expect, type Page } from '@playwright/test';

// Regression guard for the WC-backed navbar (`mp-navbar` + `mp-navbar-dropdown` +
// the `bs-dropdown-menu` panel), locking in the behaviours restored after the
// migration off the legacy Angular navbar. These are CSS/layout/interaction
// concerns (margins, `position`, centering, scroll, dismiss-on-navigate), so
// they live here (a real browser) rather than in the jsdom WC unit tests, which
// have no layout engine or media queries. The navbar is the app shell, so every
// test drives it from `/`.

const navbar = (page: Page) => page.locator('mp-navbar').first();
const toggler = (page: Page) => navbar(page).locator('label.navbar-toggler');
/** A top-level dropdown trigger — its accessible name is the slotted label. */
const trigger = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function goto(page: Page) {
  await page.goto('/');
  await expect(navbar(page)).toBeVisible();
  // Destructive (non-hydrating) bootstrap + async WC upgrade. Wait for a
  // deterministic readiness signal, not `networkidle` (the dev server's HMR
  // socket hangs it on Firefox): the navbar's shadow is rendered and its
  // dropdowns have set `data-js` (so the JS click path, not `:focus-within`, is
  // what controls visibility).
  await page.waitForFunction(() => {
    const n = document.querySelector('mp-navbar');
    const dd = document.querySelector('mp-navbar-dropdown');
    return !!(n?.shadowRoot?.querySelector('.navbar-toggler') && dd?.hasAttribute('data-js'));
  });
}

/** Computed layout of a top-level dropdown's slotted panel (`:not([slot=label])`). */
function panelInfo(page: Page, label: string) {
  return page.evaluate((name) => {
    const dds = [...document.querySelectorAll('mp-navbar-dropdown:not([data-submenu])')];
    const dd = dds.find((d) => (d.querySelector('[slot="label"]')?.textContent || '').trim() === name);
    if (!dd) return null;
    const panel = dd.querySelector<HTMLElement>(':scope > :not([slot="label"])');
    if (!panel) return null;
    const c = getComputedStyle(panel);
    const r = panel.getBoundingClientRect();
    return {
      open: dd.hasAttribute('data-open') || dd.hasAttribute('data-menu-open'),
      display: c.display,
      position: c.position,
      margin: c.margin,
    };
  }, label);
}

test.describe('navbar — wide mode (JS enabled)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await goto(page);
  });

  test('nav links are not underlined', async ({ page }) => {
    const decoration = await page.evaluate(() => {
      const a = document.querySelector('mp-navbar-item a');
      return a ? getComputedStyle(a).textDecorationLine : null;
    });
    expect(decoration).toBe('none');
  });

  test('fixed positioning pins the bar to the top, full width', async ({ page }) => {
    const box = await page.evaluate(() => {
      const n = document.querySelector('mp-navbar')!;
      const c = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      // scrollbar-agnostic: bar spans ~the full viewport width.
      return { position: c.position, top: Math.round(r.top), coversWidth: r.width >= window.innerWidth - 20 };
    });
    expect(box.position).toBe('fixed');
    expect(box.top).toBe(0);
    expect(box.coversWidth).toBe(true);
  });

  test('a first-level dropdown opens as an absolute overlay below the trigger', async ({ page }) => {
    await trigger(page, 'Basic').click();
    const info = await panelInfo(page, 'Basic');
    expect(info).toMatchObject({ open: true, display: 'block', position: 'absolute' });
  });

  test('switching between dropdowns closes the previous and opens the next', async ({ page }) => {
    // The regression: a real click (mousedown closes the open one via the
    // document outside-click listener; click opens the next). `.click()` here is
    // a trusted Playwright click, so it exercises that full path.
    await trigger(page, 'Overlays').click();
    expect((await panelInfo(page, 'Overlays'))?.open).toBe(true);

    await trigger(page, 'Advanced').click();
    expect((await panelInfo(page, 'Overlays'))?.open).toBe(false);
    expect((await panelInfo(page, 'Advanced'))?.open).toBe(true);
  });

  test('clicking a nav link dismisses the open dropdown and navigates', async ({ page }) => {
    await trigger(page, 'Basic').click();
    expect((await panelInfo(page, 'Basic'))?.open).toBe(true);

    // The WC assigns `role="menuitem"` to each item's control (the <a>), so it's
    // exposed as a menuitem, not a link.
    await page.getByRole('menuitem', { name: 'Alert', exact: true }).click();
    await expect(page).toHaveURL(/\/basic\/alert$/);
    expect((await panelInfo(page, 'Basic'))?.open).toBe(false);
  });
});

test.describe('navbar — small mode (JS enabled)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await goto(page);
  });

  test('the hamburger toggles the collapse', async ({ page }) => {
    await expect(toggler(page)).toBeVisible();
    const rows = () => page.evaluate(() =>
      getComputedStyle(document.querySelector('mp-navbar')!.shadowRoot!.querySelector('.navbar-collapse')!).gridTemplateRows);

    expect(await rows()).toBe('0px'); // collapsed
    await toggler(page).click();
    await expect.poll(rows).not.toBe('0px'); // slid open
    await toggler(page).click();
    await expect.poll(rows).toBe('0px'); // slid shut
  });

  test('the hamburger morphs into an X while open (animated toggler)', async ({ page }) => {
    // The 3 shadow bars key their transforms off the same in-shadow `:checked`
    // machine as the collapse (no-JS-safe; the JS-enabled spec carries the
    // visual assertion because computed styles are unreadable with JS off).
    const bars = () => page.evaluate(() => {
      const sr = document.querySelector('mp-navbar')!.shadowRoot!;
      const [b1, b2, b3] = [...sr.querySelectorAll('.navbar-toggler-bar')].map((b) => getComputedStyle(b));
      return { t1: b1.transform, o2: b2.opacity, t3: b3.transform };
    });

    const closed = await bars();
    expect(closed.t1).toBe('none'); // resting hamburger
    expect(closed.o2).toBe('1');

    await toggler(page).click();
    // The 0.4s transition ends in the crossed state: bars 1/3 rotated, bar 2 gone.
    await expect.poll(async () => (await bars()).o2).toBe('0');
    const open = await bars();
    expect(open.t1).not.toBe('none');
    expect(open.t3).not.toBe('none');
    expect(open.t1).not.toBe(open.t3); // opposite diagonals

    await toggler(page).click();
    await expect.poll(async () => (await bars()).o2).toBe('1'); // morphs back
    expect((await bars()).t1).toBe('none');
  });

  test('the brand is centered (equal auto inline margins)', async ({ page }) => {
    const m = await page.evaluate(() => {
      const brand = document.querySelector('[slot="brand"]')!;
      const c = getComputedStyle(brand);
      return { left: parseFloat(c.marginLeft), right: parseFloat(c.marginRight) };
    });
    expect(m.left).toBeGreaterThan(0);
    expect(Math.abs(m.left - m.right)).toBeLessThan(1); // centered
  });

  test('first-level dropdowns render inline with a 1rem inset', async ({ page }) => {
    await toggler(page).click();
    await trigger(page, 'Basic').click();
    const info = await panelInfo(page, 'Basic');
    expect(info).toMatchObject({ open: true, position: 'static', margin: '0px 16px' });
  });

  test('nested submenus render inline with a 0.5rem inset', async ({ page }) => {
    await toggler(page).click();
    await trigger(page, 'Basic').click();
    await trigger(page, 'Forms').click();
    const sub = await page.evaluate(() => {
      const dds = [...document.querySelectorAll('mp-navbar-dropdown[data-submenu]')];
      const forms = dds.find((d) => (d.querySelector('[slot="label"]')?.textContent || '').includes('Forms'));
      const panel = forms?.querySelector<HTMLElement>(':scope > :not([slot="label"])');
      if (!panel) return null;
      const c = getComputedStyle(panel);
      return { position: c.position, margin: c.margin };
    });
    expect(sub).toMatchObject({ position: 'static', margin: '0px 8px' });
  });

  test('a fixed bar whose open menu exceeds the viewport scrolls internally', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 320 }); // short: open menu > viewport
    await toggler(page).click();
    // Poll (the collapse opens over ~0.35s; content height settles after).
    await expect
      .poll(() => page.evaluate(() => {
        const n = document.querySelector('mp-navbar') as HTMLElement;
        return n.scrollHeight > n.clientHeight; // taller than the capped bar -> internal scroll
      }))
      .toBe(true);
    const info = await page.evaluate(() => {
      const n = document.querySelector('mp-navbar') as HTMLElement;
      return {
        overflowY: getComputedStyle(n).overflowY,
        capped: n.getBoundingClientRect().bottom <= window.innerHeight + 1,
      };
    });
    expect(info.overflowY).toBe('auto');
    expect(info.capped).toBe(true);
  });
});

test.describe('navbar — dark mode', () => {
  test('the hamburger icon is light on a dark navbar', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 600, height: 900 });
    await goto(page);
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');

    const rgb = await page.evaluate(() => {
      const bar = document.querySelector('mp-navbar')!.shadowRoot!.querySelector('.navbar-toggler-bar')!;
      return getComputedStyle(bar).backgroundColor; // painted via var(--bs-navbar-color)
    });
    const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.map(Number);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    expect(luminance).toBeGreaterThan(0.5); // light stroke on dark bar
  });
});
