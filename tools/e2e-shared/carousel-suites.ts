import type { Locator, Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

export interface CarouselSuiteOptions {
  /** Demo page path (all three apps use /basic/carousel). */
  path?: string;
  /** The ng demo adds a nested horizontal-in-vertical section. */
  nested?: boolean;
}

const PATH = '/basic/carousel';

// The carousel renders in the light DOM (#437): every query is anchored with
// `:scope >` so a carousel nested in a slide never answers for its outer deck.
const deck = (page: Page, label: string) => page.locator(`.carousel[role="region"][aria-label="${label}"]`);
const main = (page: Page) => deck(page, 'Animal photos');
const fadePair = (page: Page) => deck(page, 'Fade pair');
const slidePair = (page: Page) => deck(page, 'Slide pair');
const radio = (car: Locator, i: number) => car.locator(':scope > .car-radio').nth(i);
const indicator = (car: Locator, i: number) => car.locator(':scope > .carousel-indicators > label').nth(i);
const slide = (car: Locator, i: number) => car.locator(':scope > .carousel-inner > .carousel-track > .carousel-item').nth(i);
const viewport = (car: Locator) => car.locator(':scope > .carousel-inner');
const control = (car: Locator, step: 'prev' | 'next') => car.locator(`:scope > .carousel-controls .carousel-control-${step}:visible`);

/**
 * JS-enabled behavior suite. Readiness is a deterministic DOM predicate (not
 * networkidle — the dev server's HMR socket hangs it on Firefox); "click,
 * never focus".
 */
export function carouselJsSuite(test: Test, expect: Expect, options: CarouselSuiteOptions = {}) {
  const path = options.path ?? PATH;

  async function goto(page: Page) {
    await page.goto(path);
    await expect(main(page)).toHaveAttribute('data-mp-hydrated', /.*/);
    // Autoplay would race the assertions: pause via the APG button, then park
    // deterministically on slide 1.
    const btn = main(page).locator(':scope > .carousel-play-pause > .carousel-play-pause-btn');
    if ((await btn.getAttribute('aria-pressed')) === 'false') {
      await btn.click();
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await indicator(main(page), 0).click();
    await expect(radio(main(page), 0)).toBeChecked();
  }

  test.describe('carousel (JS)', () => {
    test('hydrates the server render without duplicating it', async ({ page }) => {
      await goto(page);
      const car = main(page);
      await expect(car.locator(':scope > .carousel-inner > .carousel-track')).toHaveCount(1);
      await expect(car.locator(':scope > .carousel-indicators')).toHaveCount(1);
      await expect(car.locator(':scope > .car-radio')).toHaveCount(6);
      await expect(car.locator(':scope > .carousel-inner > .carousel-track > .carousel-item')).toHaveCount(6);
    });

    test('indicators navigate; radios, aria-current and the shown slide stay in sync', async ({ page }) => {
      await goto(page);
      const car = main(page);
      await indicator(car, 3).click();
      await expect(radio(car, 3)).toBeChecked();
      await expect(indicator(car, 3)).toHaveAttribute('aria-current', 'true');
      await expect(slide(car, 3)).toBeVisible();
      await expect(slide(car, 0)).toBeHidden();
    });

    test('prev/next controls navigate and wrap in BOTH directions', async ({ page }) => {
      await goto(page);
      const car = main(page);
      await control(car, 'prev').click();
      await expect(radio(car, 5)).toBeChecked();
      await expect(slide(car, 5)).toBeVisible();
      await control(car, 'next').click();
      await expect(radio(car, 0)).toBeChecked();
      await expect(slide(car, 0)).toBeVisible();
    });

    test('viewport keyboard: arrows + End navigate, only consumed keys act', async ({ page }) => {
      await goto(page);
      const car = main(page);
      await viewport(car).focus();
      await page.keyboard.press('ArrowRight');
      await expect(radio(car, 1)).toBeChecked();
      await page.keyboard.press('End');
      await expect(radio(car, 5)).toBeChecked();
      await page.keyboard.press('Home');
      await expect(radio(car, 0)).toBeChecked();
    });

    test('fade mode swaps the shown slide', async ({ page }) => {
      await goto(page);
      const car = fadePair(page);
      await car.scrollIntoViewIfNeeded();
      await expect(slide(car, 0)).toBeVisible();
      await indicator(car, 2).click();
      await expect(slide(car, 2)).toBeVisible();
      await expect(slide(car, 0)).toBeHidden();
    });

    test('slides top-align in horizontal slide mode', async ({ page }) => {
      // The demo images have different aspect ratios, and a horizontally
      // sliding top edge that jumps per slide is what the eye tracks — so
      // every slide sits flush with the top.
      await goto(page);
      const gaps = await main(page).evaluate((el: Element) => {
        const top = el.querySelector(':scope > .carousel-inner')!.getBoundingClientRect().top;
        return [...el.querySelectorAll(':scope > .carousel-inner > .carousel-track > .carousel-item > img')].map((img) =>
          Math.round(img.getBoundingClientRect().top - top),
        );
      });
      expect(gaps.length).toBeGreaterThan(1);
      gaps.forEach((gap) => expect(Math.abs(gap)).toBeLessThanOrEqual(1));
    });

    test('the viewport follows the current slide height', async ({ page }) => {
      await goto(page);
      const car = main(page);
      // The viewport's height matches the active slide's content, after each move.
      const fits = () =>
        car.evaluate((el: Element) => {
          const vp = el.querySelector(':scope > .carousel-inner')!.getBoundingClientRect().height;
          const active = el.querySelector(':scope > .carousel-inner > .carousel-track > .carousel-item[data-active] > *')!;
          return Math.abs(vp - active.getBoundingClientRect().height) <= 1;
        });
      await expect.poll(fits).toBe(true);
      await indicator(car, 1).click();
      await expect(radio(car, 1)).toBeChecked();
      await expect.poll(fits).toBe(true);
    });

    test('the ARIA contract holds on the hydrated tree', async ({ page }) => {
      await goto(page);
      const car = main(page);
      await expect(car).toHaveAttribute('role', 'region');
      await expect(car).toHaveAttribute('aria-roledescription', 'carousel');
      const vp = viewport(car);
      await expect(vp).toHaveAttribute('tabindex', '0');
      // No aria-orientation: the viewport carries no role, and only widgets
      // may take the attribute (axe aria-allowed-attr).
      await expect(vp).not.toHaveAttribute('aria-orientation', /.*/);
      await expect(vp).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End');
      // paused ⇒ polite
      await expect(vp).toHaveAttribute('aria-live', 'polite');
      const cell = slide(car, 1);
      await expect(cell).toHaveAttribute('role', 'group');
      await expect(cell).toHaveAttribute('aria-roledescription', 'slide');
      await expect(cell).toHaveAttribute('aria-label', '2 of 6');
      // A waiting slide is out of both trees (visibility: hidden).
      await expect(cell).toBeHidden();
    });

    if (options.nested) {
      test('nested: inner horizontal arrows do not drive the vertical outer', async ({ page }) => {
        await goto(page);
        const outer = deck(page, 'Outer vertical');
        const inner = deck(page, 'Inner horizontal');
        // The inner carousel lives in the outer's SECOND slide, which is
        // hidden, so nothing in it can be focused or driven: navigate the
        // outer there first, like a keyboard user must.
        await expect(slide(outer, 1)).toBeHidden();
        await viewport(outer).focus();
        await page.keyboard.press('ArrowDown');
        await expect(radio(outer, 1)).toBeChecked();

        await viewport(inner).focus();
        await page.keyboard.press('ArrowRight');
        await expect(radio(inner, 1)).toBeChecked();
        await expect(radio(outer, 1)).toBeChecked(); // outer untouched
        // ArrowDown is off-axis for the inner and must not move it either;
        // it also must NOT leak into the outer (keydown target guard).
        await page.keyboard.press('ArrowDown');
        await expect(radio(inner, 1)).toBeChecked();
        await expect(radio(outer, 1)).toBeChecked();
      });
    }
  });
}

/**
 * No-JS suite (file-level `test.use({ javaScriptEnabled: false })` is applied
 * by the caller). Locator/native-state assertions only — with JS disabled
 * page.evaluate is unavailable.
 */
export function carouselNojsSuite(test: Test, expect: Expect, options: CarouselSuiteOptions = {}) {
  const path = options.path ?? PATH;

  test.describe('carousel (no JS)', () => {
    // The state machine is what's under test, not transition smoothness:
    // reduced motion collapses the CSS transitions (the component honours it),
    // which keeps Playwright's stability checks deterministic on cold servers.
    // Cast: these suites are generic over `Test = typeof testBase`, and through
    // that alias TS resolves `use()` to `Fixtures<{}, {}, …>`, which does not
    // admit built-in options like `reducedMotion` even though Playwright accepts
    // it at runtime. Narrowing the alias would ripple through every suite here.
    test.use({ reducedMotion: 'reduce' } as Parameters<Test['use']>[0]);

    // No `waitForLoadState('networkidle')`: the dev server holds an HMR
    // websocket open, so the network never goes idle and the wait burns its
    // full timeout on Firefox. Everything under test is in the server-rendered
    // HTML, `goto` already waits for `load`, and every assertion auto-retries.
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('the server render carries the radio machine', async ({ page }) => {
      const car = fadePair(page);
      await expect(car).not.toHaveAttribute('data-mp-hydrated', /.*/);
      await expect(car.locator(':scope > .car-radio')).toHaveCount(3);
      await expect(radio(car, 0)).toBeChecked();
      await expect(car.locator(':scope > .carousel-indicators > label')).toHaveCount(3);
      // Only the active slide's control pair is revealed.
      await expect(control(car, 'next')).toHaveCount(1);
    });

    test('fade: indicator labels flip radios and crossfade the slides', async ({ page }) => {
      const car = fadePair(page);
      await expect(slide(car, 0)).toHaveCSS('opacity', '1');
      await expect(slide(car, 2)).toHaveCSS('opacity', '0');
      await indicator(car, 2).click();
      await expect(radio(car, 2)).toBeChecked();
      await expect(slide(car, 2)).toHaveCSS('opacity', '1');
      await expect(slide(car, 0)).toHaveCSS('opacity', '0');
    });

    test('slide: prev/next labels move the deck and wrap around', async ({ page }) => {
      const car = slidePair(page);
      await car.scrollIntoViewIfNeeded();
      await expect(slide(car, 0)).toBeVisible();
      await control(car, 'next').click();
      await expect(radio(car, 1)).toBeChecked();
      await expect(slide(car, 1)).toBeVisible();
      await expect(slide(car, 0)).toBeHidden();
      // wrap: prev, prev again from slide 0 lands on the last slide
      await control(car, 'prev').click();
      await expect(radio(car, 0)).toBeChecked();
      await control(car, 'prev').click();
      await expect(radio(car, 2)).toBeChecked();
      await expect(slide(car, 2)).toBeVisible();
    });

    test('keyboard: the radiogroup arrows change slides with JS off', async ({ page }) => {
      const car = slidePair(page);
      await radio(car, 0).focus();
      await page.keyboard.press('ArrowRight');
      await expect(radio(car, 1)).toBeChecked();
      await page.keyboard.press('ArrowRight');
      await expect(radio(car, 2)).toBeChecked();
      // (No wrap assertion: WebKit's native radio groups stop at the ends —
      // no-JS wrap-around is the prev/next labels' job, covered above.)
      await page.keyboard.press('ArrowLeft');
      await expect(radio(car, 1)).toBeChecked();
    });

    test('two carousels on one page keep independent state (per-instance radio groups)', async ({ page }) => {
      // Each deck's radios are named by its own id, so checking one
      // carousel's radio must leave every other carousel's checked radio
      // alone. A single action + pure assertions. (Deliberately no second
      // cross-element ACTION: Chromium with JS disabled intermittently hangs
      // the actionability stability wait when switching action targets.)
      const fade = fadePair(page);
      await indicator(fade, 1).click();
      await expect(radio(fade, 1)).toBeChecked();
      await expect(radio(slidePair(page), 0)).toBeChecked();
      await expect(radio(main(page), 0)).toBeChecked();
    });

    test('the region semantics are stamped server-side', async ({ page }) => {
      const car = main(page);
      await expect(car).toHaveAttribute('role', 'region');
      await expect(car).toHaveAttribute('aria-roledescription', 'carousel');
      // No interactive-tier lies in the server render: the viewport isn't focusable.
      await expect(viewport(car)).not.toHaveAttribute('tabindex', '0');
    });
  });
}
