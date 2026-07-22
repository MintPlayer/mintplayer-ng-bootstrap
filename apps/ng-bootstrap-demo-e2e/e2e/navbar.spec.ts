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

  test('page content clears the fixed bar by its live height (bsNavbarContent)', async ({ page }) => {
    // The directive replaces a hand-maintained padding constant: a
    // ResizeObserver sets the content's padding-top to the bar's offsetHeight.
    await expect
      .poll(() => page.evaluate(() => {
        const bar = document.querySelector('mp-navbar') as HTMLElement;
        const content = document.querySelector('.app-content') as HTMLElement;
        return Math.abs(parseFloat(getComputedStyle(content).paddingTop) - bar.offsetHeight) < 1;
      }))
      .toBe(true);
  });

  test('bs-navbar-nav groups flatten into the nav row; the end group right-aligns', async ({ page }) => {
    // The grouping container is display:contents, so its items must be REAL
    // flex children of the WC's .navbar-nav (same row as any bare item), and
    // align="end" must land the group in the right-pushed end list — the
    // mechanism the Phase-7 spike validated, locked in against the live app.
    const info = await page.evaluate(() => {
      const home = [...document.querySelectorAll('mp-navbar-item a')].find((a) => a.textContent === 'Home')!;
      const groups = [...document.querySelectorAll('bs-navbar-nav')];
      const endItem = document.querySelector('bs-navbar-nav[slot="end"] mp-navbar-item')!;
      const hr = home.getBoundingClientRect();
      const er = endItem.getBoundingClientRect();
      return {
        displays: groups.map((g) => getComputedStyle(g).display),
        rowAligned: Math.abs(hr.y + hr.height / 2 - (er.y + er.height / 2)) < 2,
        endX: er.x,
        vw: window.innerWidth,
      };
    });
    expect(info.displays).toEqual(['contents', 'contents']);
    expect(info.rowAligned).toBe(true); // grouped items are flex peers of bare items
    expect(info.endX).toBeGreaterThan(info.vw / 2); // end group pushed right
  });

  test('a first-level dropdown opens as an absolute overlay below the trigger', async ({ page }) => {
    await trigger(page, 'Basic').click();
    const info = await panelInfo(page, 'Basic');
    expect(info).toMatchObject({ open: true, display: 'block', position: 'absolute' });
  });

  test('switching between dropdowns closes the previous and opens the next', async ({ page }) => {
    // Open + close both ride the mousedown (press-time resolution): the open
    // dropdown's document capture listener closes it, then the pressed
    // trigger's own handler opens the next — one event, deterministic order.
    // Assert VISIBILITY, not just the state flag (a flag-only check once
    // passed while the panel wasn't painted).
    await trigger(page, 'Overlays').click();
    expect(await panelInfo(page, 'Overlays')).toMatchObject({ open: true, display: 'block' });

    await trigger(page, 'Advanced').click();
    expect(await panelInfo(page, 'Overlays')).toMatchObject({ open: false, display: 'none' });
    expect(await panelInfo(page, 'Advanced')).toMatchObject({ open: true, display: 'block' });
  });

  test('switching survives a drifting click (press-time resolution)', async ({ page }) => {
    // The real-mouse failure mode: press on the "Advanced" trigger, release a
    // few px lower — in the zone where the open "Overlays" panel bleeds under
    // this trigger. With a click-based open, the mid-gesture panel removal
    // retargets the click to the common ancestor and the dropdown never opens
    // (the user needed a second click). Press-time resolution is immune: the
    // toggle fires on mousedown, before any drift.
    await trigger(page, 'Overlays').click();
    expect((await panelInfo(page, 'Overlays'))?.open).toBe(true);

    const box = (await trigger(page, 'Advanced').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 6); // drift below the trigger
    await page.mouse.up();

    expect(await panelInfo(page, 'Advanced')).toMatchObject({ open: true, display: 'block' });
    expect(await panelInfo(page, 'Overlays')).toMatchObject({ open: false, display: 'none' });
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
