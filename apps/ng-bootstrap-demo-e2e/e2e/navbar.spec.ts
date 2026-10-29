import { test, expect, type Page } from '@playwright/test';

// Regression guard for the navbar (#437: headless core + Angular front, light
// DOM). `<bs-navbar>` is the `.navbar` itself; the collapse is a checkbox and
// every dropdown a native `<details>` whose `<summary>` is the trigger and whose
// `.dropdown-menu` child is the panel. These are CSS/layout/interaction
// concerns (margins, `position`, centering, scroll, dismiss-on-navigate), so
// they live here (a real browser) rather than in the jsdom unit tests, which
// have no layout engine or media queries. The navbar is the app shell, so every
// test drives it from `/`.

const navbar = (page: Page) => page.locator('bs-navbar').first();
const toggler = (page: Page) => navbar(page).locator('label.navbar-toggler');
/** A dropdown trigger: the label inside its `<summary>`. */
const trigger = (page: Page, name: string) => navbar(page).locator('summary').getByText(name, { exact: true });
const collapseRows = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.querySelector('bs-navbar .navbar-collapse')!).gridTemplateRows);

async function goto(page: Page) {
  await page.goto('/');
  await expect(navbar(page)).toBeVisible();
  // Hydrated: the core writes the toggle's role and state only on the client,
  // so their presence means the attachment (keys, outside click, dismiss on
  // navigate) is live. Not `networkidle`: the dev server's HMR socket hangs it.
  await expect(navbar(page).locator('input.navbar-toggle[aria-expanded]')).toHaveCount(1);
}

/** A dropdown's open state and its panel's computed layout, by trigger label. */
function panelInfo(page: Page, label: string) {
  return page.evaluate((name) => {
    const details = [...document.querySelectorAll<HTMLDetailsElement>('bs-navbar details.dropdown')].find(
      (d) => (d.querySelector(':scope > summary')?.textContent || '').trim() === name,
    );
    const panel = details?.querySelector<HTMLElement>(':scope > .dropdown-menu');
    if (!details || !panel) return null;
    const c = getComputedStyle(panel);
    return {
      open: details.open,
      visible: panel.checkVisibility(),
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
      const a = document.querySelector('bs-navbar-item a');
      return a ? getComputedStyle(a).textDecorationLine : null;
    });
    expect(decoration).toBe('none');
  });

  test('fixed positioning pins the bar to the top, full width', async ({ page }) => {
    const box = await page.evaluate(() => {
      const n = document.querySelector('bs-navbar')!;
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
    // Server-side the offset is a CSS estimate; once rendered, a
    // ResizeObserver sets the content's padding-top to the bar's offsetHeight.
    await expect
      .poll(() => page.evaluate(() => {
        const bar = document.querySelector('bs-navbar') as HTMLElement;
        const content = document.querySelector('.app-content') as HTMLElement;
        return Math.abs(parseFloat(getComputedStyle(content).paddingTop) - bar.offsetHeight) < 1;
      }))
      .toBe(true);
  });

  test('the nav groups share one row; the end group right-aligns', async ({ page }) => {
    const info = await page.evaluate(() => {
      const groups = [...document.querySelectorAll('bs-navbar-nav')];
      const home = [...document.querySelectorAll('bs-navbar-item a')].find((a) => a.textContent === 'Home')!;
      const endItem = document.querySelector('bs-navbar-nav.nav-end bs-navbar-item')!;
      const hr = home.getBoundingClientRect();
      const er = endItem.getBoundingClientRect();
      return {
        groups: groups.map((g) => g.classList.contains('navbar-nav')),
        rowAligned: Math.abs(hr.y + hr.height / 2 - (er.y + er.height / 2)) < 2,
        endX: er.x,
        vw: window.innerWidth,
      };
    });
    expect(info.groups).toEqual([true, true]);
    expect(info.rowAligned).toBe(true);
    expect(info.endX).toBeGreaterThan(info.vw / 2); // end group pushed right
  });

  test('a first-level dropdown opens as an absolute overlay below the trigger', async ({ page }) => {
    await trigger(page, 'Basic').click();
    expect(await panelInfo(page, 'Basic')).toMatchObject({ open: true, visible: true, position: 'absolute' });
  });

  test('switching between dropdowns closes the previous and opens the next', async ({ page }) => {
    // Assert VISIBILITY, not just the state flag (a flag-only check once
    // passed while the panel wasn't painted).
    await trigger(page, 'Overlays').click();
    expect(await panelInfo(page, 'Overlays')).toMatchObject({ open: true, visible: true });

    await trigger(page, 'Advanced').click();
    expect(await panelInfo(page, 'Overlays')).toMatchObject({ open: false, visible: false });
    expect(await panelInfo(page, 'Advanced')).toMatchObject({ open: true, visible: true });
  });

  test('switching survives a drifting click (press-time resolution)', async ({ page }) => {
    // The real-mouse failure mode: press on the "Advanced" trigger, release a
    // few px lower, in the zone the open "Overlays" panel covered. A click-time
    // toggle loses that gesture: the click retargets to a common ancestor and
    // the dropdown never opens. The core toggles on the press instead.
    await trigger(page, 'Overlays').click();
    expect((await panelInfo(page, 'Overlays'))?.open).toBe(true);

    const box = (await trigger(page, 'Advanced').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 6); // drift below the trigger
    await page.mouse.up();

    expect(await panelInfo(page, 'Advanced')).toMatchObject({ open: true, visible: true });
    expect(await panelInfo(page, 'Overlays')).toMatchObject({ open: false, visible: false });
  });

  test('clicking a nav link dismisses the open dropdown and navigates', async ({ page }) => {
    await trigger(page, 'Basic').click();
    expect((await panelInfo(page, 'Basic'))?.open).toBe(true);

    // Disclosure navigation, not an ARIA menu: items stay links.
    await navbar(page).getByRole('link', { name: 'Alert', exact: true }).click();
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
    const rows = () => collapseRows(page);

    expect(await rows()).toBe('0px'); // collapsed
    await toggler(page).click();
    await expect.poll(rows).not.toBe('0px'); // slid open
    await toggler(page).click();
    await expect.poll(rows).toBe('0px'); // slid shut
  });

  test('the hamburger morphs into an X while open (animated toggler)', async ({ page }) => {
    // The 3 bars key their transforms off the same `:checked` state as the
    // collapse (no-JS-safe; the JS-enabled spec carries the visual assertion
    // because computed styles are unreadable with JS off).
    const bars = () => page.evaluate(() => {
      const [b1, b2, b3] = [...document.querySelectorAll('bs-navbar .navbar-toggler-bar')].map((b) => getComputedStyle(b));
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

  test('clicking a TOP-LEVEL nav link collapses the bar', async ({ page }) => {
    // Clicks a TOP-LEVEL link, not a menu item: closing a dropdown hides its
    // items and drops focus, which would mask a collapse that stays open.
    const rows = () => collapseRows(page);

    await toggler(page).click();
    await expect.poll(rows).not.toBe('0px'); // open

    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(rows).toBe('0px'); // slid shut despite focus on the link
  });

  test('the brand is centered (equal auto inline margins)', async ({ page }) => {
    const m = await page.evaluate(() => {
      const brand = document.querySelector('bs-navbar .navbar-brand')!;
      const c = getComputedStyle(brand);
      return { left: parseFloat(c.marginLeft), right: parseFloat(c.marginRight) };
    });
    expect(m.left).toBeGreaterThan(0);
    expect(Math.abs(m.left - m.right)).toBeLessThan(1); // centered
  });

  test('first-level dropdowns render inline with a 1rem inset', async ({ page }) => {
    await toggler(page).click();
    await trigger(page, 'Basic').click();
    expect(await panelInfo(page, 'Basic')).toMatchObject({ open: true, position: 'static', margin: '0px 16px' });
  });

  test('nested submenus render inline with a 0.5rem inset', async ({ page }) => {
    await toggler(page).click();
    await trigger(page, 'Basic').click();
    await trigger(page, 'Forms').click();
    expect(await panelInfo(page, 'Forms')).toMatchObject({ open: true, position: 'static', margin: '0px 8px' });
  });

  test('a fixed bar whose open menu exceeds the viewport scrolls internally', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 320 }); // short: open menu > viewport
    await toggler(page).click();
    // Poll (the collapse opens over ~0.35s; content height settles after).
    await expect
      .poll(() => page.evaluate(() => {
        const n = document.querySelector('bs-navbar') as HTMLElement;
        return n.scrollHeight > n.clientHeight; // taller than the capped bar -> internal scroll
      }))
      .toBe(true);
    const info = await page.evaluate(() => {
      const n = document.querySelector('bs-navbar') as HTMLElement;
      return {
        overflowY: getComputedStyle(n).overflowY,
        capped: n.getBoundingClientRect().bottom <= window.innerHeight + 1,
      };
    });
    expect(info.overflowY).toBe('auto');
    expect(info.capped).toBe(true);
  });
});

test.describe('navbar — active-route highlighting', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await goto(page);
  });

  test('the top-level link of the current route recolors (nav-link.active)', async ({ page }) => {
    // '/' is active on load (exact match). Compare against an inactive link's
    // color rather than a hard-coded token value.
    const colors = await page.evaluate(() => {
      const links = [...document.querySelectorAll('bs-navbar-item a')];
      const home = links.find((a) => a.textContent === 'Home')!;
      return {
        homeActive: home.classList.contains('active'),
        home: getComputedStyle(home).color,
        inactive: getComputedStyle(links.find((a) => a.textContent !== 'Home')!).color,
      };
    });
    expect(colors.homeActive).toBe(true);
    expect(colors.home).not.toBe(colors.inactive);
  });

  test('the menu item of the current route paints the full row with the active background', async ({ page }) => {
    await trigger(page, 'Basic').click();
    await navbar(page).getByRole('link', { name: 'Alert', exact: true }).click();
    await expect(page).toHaveURL(/\/basic\/alert$/);

    await trigger(page, 'Basic').click(); // reopen to inspect the item
    const info = await page.evaluate(() => {
      const a = [...document.querySelectorAll('.dropdown-item > a')].find((x) => x.textContent === 'Alert')!;
      const item = a.closest('.dropdown-item')!;
      const ar = a.getBoundingClientRect();
      const ir = item.getBoundingClientRect();
      return {
        active: a.classList.contains('active'),
        bg: getComputedStyle(a).backgroundColor,
        fillsRow: Math.abs(ar.width - ir.width) < 1, // negative-margin fill = legacy full-row look
      };
    });
    expect(info.active).toBe(true);
    expect(info.bg).not.toBe('rgba(0, 0, 0, 0)'); // primary active background
    expect(info.fillsRow).toBe(true);
  });

  test('the trigger CHAIN of the active route highlights without opening anything', async ({ page }) => {
    // Navigate to a nested route (Basic → Forms → Select), then assert both
    // ancestor triggers carry `.active` while closed.
    await trigger(page, 'Basic').click();
    await trigger(page, 'Forms').click();
    await navbar(page).getByRole('link', { name: 'Select', exact: true }).click();
    await expect(page).toHaveURL(/\/basic\/forms\/select$/);

    const state = await page.evaluate(() => {
      const summaryOf = (name: string) =>
        [...document.querySelectorAll('bs-navbar details.dropdown > summary')].find((s) => (s.textContent || '').trim() === name)!;
      return {
        basicActive: summaryOf('Basic').classList.contains('active'),
        formsActive: summaryOf('Forms').classList.contains('active'),
        overlaysActive: summaryOf('Overlays').classList.contains('active'),
        anyOpen: !!document.querySelector('bs-navbar details.dropdown[open]'),
        triggerColor: getComputedStyle(summaryOf('Basic')).color,
        inactiveColor: getComputedStyle(summaryOf('Overlays')).color,
      };
    });
    expect(state.anyOpen).toBe(false); // dismiss-on-navigate closed everything
    expect(state.basicActive).toBe(true);
    expect(state.formsActive).toBe(true);
    expect(state.overlaysActive).toBe(false);
    expect(state.triggerColor).not.toBe(state.inactiveColor); // recolored while closed
  });
});

test.describe('navbar — keyboard a11y', () => {
  const active = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      return {
        desc: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20),
        inNavbar: !!el.closest('bs-navbar'),
      };
    });

  test('small mode: Tab reaches the toggler with a visible rounded focus ring', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await goto(page);

    // Tab: brand link → the toggle checkbox (real keyboard so :focus-visible applies).
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect((await active(page))?.desc).toBe('input.navbar-toggle');

    // The ring paints on the visible label (sibling selector), rounded.
    const ring = await page.evaluate(() => {
      const c = getComputedStyle(document.querySelector('bs-navbar .navbar-toggler')!);
      return { boxShadow: c.boxShadow, borderRadius: parseFloat(c.borderRadius) };
    });
    expect(ring.boxShadow).not.toBe('none');
    expect(ring.borderRadius).toBeGreaterThan(0);
  });

  test('small mode collapsed: the menu is OUT of the tab order (no focus into invisible content)', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await goto(page);

    await page.keyboard.press('Tab'); // brand
    await page.keyboard.press('Tab'); // toggler checkbox
    await page.keyboard.press('Tab'); // must SKIP the hidden collapse entirely
    const stop = await active(page);
    expect(stop?.inNavbar ?? false).toBe(false); // lands in page content, not invisible links
  });

  test('small mode expanded: menu items ARE tabbable again', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await goto(page);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // open the collapse via the checkbox
    await page.keyboard.press('Tab');
    expect((await active(page))?.text).toBe('Home');
  });

  test('wide mode: ArrowDown enters the panel; Escape closes and returns focus to the trigger', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await goto(page);

    await page.evaluate(() => {
      const summary = [...document.querySelectorAll<HTMLElement>('bs-navbar details.nav-item.dropdown > summary')].find(
        (s) => (s.textContent || '').trim() === 'Basic',
      )!;
      summary.focus();
    });
    await page.keyboard.press('ArrowDown');
    expect((await panelInfo(page, 'Basic'))?.open).toBe(true);
    expect((await active(page))?.text).toBe('Alert'); // first item's link focused

    await page.keyboard.press('Escape');
    expect((await panelInfo(page, 'Basic'))?.open).toBe(false);
    expect((await active(page))?.desc).toBe('summary.nav-link'); // back on the trigger
  });
});

test.describe('navbar — dark mode', () => {
  test('the hamburger icon is light on a dark navbar', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 600, height: 900 });
    await goto(page);
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');

    const rgb = await page.evaluate(() =>
      // painted via var(--bs-navbar-color)
      getComputedStyle(document.querySelector('bs-navbar .navbar-toggler-bar')!).backgroundColor);
    const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.map(Number);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    expect(luminance).toBeGreaterThan(0.5); // light stroke on dark bar
  });
});
