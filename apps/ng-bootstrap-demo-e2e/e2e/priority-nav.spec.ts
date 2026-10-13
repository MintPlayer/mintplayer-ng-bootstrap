import { test, expect, Page } from '@playwright/test';

/**
 * Lets the nav settle for a few frames, then counts class changes inside it for `ms`. A nav whose
 * overflow decision feeds back into its own input flips classes every frame (#428).
 */
function classMutations(page: Page, selector: string, ms = 1000) {
  return page.evaluate(async ([selector, ms]) => {
    const frame = () => new Promise(requestAnimationFrame);
    for (let i = 0; i < 10; i++) await frame();
    let count = 0;
    const observer = new MutationObserver((records) => (count += records.length));
    observer.observe(document.querySelector(selector as string)!, { subtree: true, attributes: true, attributeFilter: ['class'] });
    await new Promise((resolve) => setTimeout(resolve, ms as number));
    observer.disconnect();
    return count;
  }, [selector, ms] as const);
}

/** Inline items shown, whether More shows, and whether anything is clipped. Primitives only. */
function navState(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const nav = document.querySelector(selector)!;
    const strip = nav.querySelector('.priority-nav-strip') as HTMLElement;
    const more = nav.querySelector('button.priority-nav-more-toggle') as HTMLElement;
    const inline = [...strip.querySelectorAll('.priority-nav-item')].filter((i) => !i.classList.contains('priority-nav-hidden'));
    return {
      inline: inline.length,
      more: !more.classList.contains('priority-nav-hidden'),
      clipped: strip.scrollWidth > strip.clientWidth + 1,
    };
  }, selector);
}

/**
 * The overflow menu closes after an item action (#426), in a real browser:
 * keyboard activation and the focus return can only be trusted here.
 */
test.describe('priority-nav overflow actions', () => {
  test.beforeEach(async ({ page }) => {
    // Below sm, so collapseAt='sm' puts every action into More.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/advanced/priority-nav');
  });

  test('activating an action by keyboard runs it, closes More and returns focus to it', async ({ page }) => {
    const demo = page.locator('.actions-demo');
    const more = demo.locator('button.priority-nav-more-toggle');
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');

    const edit = demo.locator('.priority-nav-overflow').getByRole('button', { name: 'Edit' });
    await edit.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Last action: Edit')).toBeVisible();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more).toBeFocused();
  });
});

/**
 * #428: a nav that is a flex item sized by its own content used to flip between "all inline" and
 * "last item in More" every frame in Firefox, and could never collapse at all.
 */
test.describe('priority-nav in a flex header', () => {
  const nav = '.header-demo bs-priority-nav';

  test.beforeEach(async ({ page }) => {
    await page.goto('/advanced/priority-nav');
    await expect(page.locator(`${nav} .priority-nav-strip`)).toBeVisible();
  });

  for (const width of [1280, 600, 400]) {
    test(`settles without clipping at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      expect(await classMutations(page, nav)).toBe(0);
      expect((await navState(page, nav)).clipped).toBe(false);
    });
  }

  test('keeps every action inline when there is room', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await classMutations(page, nav)).toBe(0);
    expect(await navState(page, nav)).toEqual({ inline: 3, more: false, clipped: false });
  });

  test('collapses into More in a narrow card, and recovers when it widens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const card = page.locator('.header-demo');
    const header = page.locator('.header-demo-header');

    await card.evaluate((el: HTMLElement) => (el.style.width = '330px'));
    expect(await classMutations(page, nav)).toBe(0);
    const narrow = await navState(page, nav);
    expect(narrow.more).toBe(true);
    expect(narrow.inline).toBeLessThan(3);
    expect(narrow.clipped).toBe(false);
    // The nav gave way instead of pushing the header wider than the card.
    expect(await header.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

    await card.evaluate((el: HTMLElement) => (el.style.width = ''));
    expect(await classMutations(page, nav)).toBe(0);
    expect(await navState(page, nav)).toEqual({ inline: 3, more: false, clipped: false });
  });

  test('stays at the start of a plain block container', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const offset = await page.locator('.action-bar-demo').evaluate((bar) => {
      const first = bar.querySelector('.priority-nav-item')!.getBoundingClientRect();
      return first.left - (bar.getBoundingClientRect().left + parseFloat(getComputedStyle(bar).paddingLeft));
    });
    expect(Math.abs(offset)).toBeLessThan(1);
  });
});
