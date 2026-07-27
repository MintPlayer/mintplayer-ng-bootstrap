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

const main = (page: Page) => page.locator('mp-carousel[aria-label="Animal photos"]');
const fadePair = (page: Page) => page.locator('mp-carousel[aria-label="Fade pair"]');
const slidePair = (page: Page) => page.locator('mp-carousel[aria-label="Slide pair"]');
const radio = (car: Locator, i: number) => car.locator(`.car-radio >> nth=${i}`);
const indicator = (car: Locator, i: number) => car.locator(`.carousel-indicators label >> nth=${i}`);
const slideImg = (car: Locator, i: number) => car.locator(`> img >> nth=${i}`);

/**
 * JS-enabled behavior suite. Readiness is a deterministic shadow predicate
 * (not networkidle — the dev server's HMR socket hangs it on Firefox), per the
 * navbar spec precedent; "click, never focus".
 */
export function carouselJsSuite(test: Test, expect: Expect, options: CarouselSuiteOptions = {}) {
  const path = options.path ?? PATH;

  async function goto(page: Page) {
    await page.goto(path);
    await page.waitForFunction(() => {
      const c = document.querySelector('mp-carousel');
      return !!(
        c &&
        c.hasAttribute('data-js') &&
        c.shadowRoot?.querySelector('.carousel-track') &&
        c.firstElementChild?.assignedSlot
      );
    });
    // Autoplay would race the assertions: pause via the APG button, then park
    // deterministically on slide 1.
    const btn = main(page).locator('.carousel-play-pause-btn');
    if ((await btn.getAttribute('aria-pressed')) === 'false') {
      await btn.click();
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await indicator(main(page), 0).click();
    await expect(radio(main(page), 0)).toBeChecked();
  }

  test.describe('carousel (JS)', () => {
    test('hydrates the SSR chrome without duplicating it', async ({ page }) => {
      await goto(page);
      const counts = await main(page).evaluate((el: Element) => {
        const sr = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
        return {
          tracks: sr.querySelectorAll('.carousel-track').length,
          indicatorStrips: sr.querySelectorAll('.carousel-indicators').length,
          cells: sr.querySelectorAll('.carousel-item[data-i]').length,
        };
      });
      expect(counts).toEqual({ tracks: 1, indicatorStrips: 1, cells: 6 });
    });

    test('indicators navigate; radios, aria-current and the track transform stay in sync', async ({ page }) => {
      await goto(page);
      const car = main(page);
      await indicator(car, 3).click();
      await expect(radio(car, 3)).toBeChecked();
      await expect(indicator(car, 3)).toHaveAttribute('aria-current', 'true');
      await expect(slideImg(car, 3)).toBeInViewport();
      await expect(slideImg(car, 0)).not.toBeInViewport();
    });

    test('prev/next controls navigate and wrap in BOTH directions', async ({ page }) => {
      await goto(page);
      const car = main(page);
      // prev from slide 0 wraps to the last slide
      await car.locator('.carousel-controls .carousel-control-prev:visible').click();
      await expect(radio(car, 5)).toBeChecked();
      await expect(slideImg(car, 5)).toBeInViewport();
      // next from the last slide wraps home
      await car.locator('.carousel-controls .carousel-control-next:visible').click();
      await expect(radio(car, 0)).toBeChecked();
      await expect(slideImg(car, 0)).toBeInViewport();
    });

    test('viewport keyboard: arrows + End navigate, only consumed keys act', async ({ page }) => {
      await goto(page);
      const car = main(page);
      const viewport = car.locator('.carousel-inner');
      await viewport.focus();
      await page.keyboard.press('ArrowRight');
      await expect(radio(car, 1)).toBeChecked();
      await page.keyboard.press('End');
      await expect(radio(car, 5)).toBeChecked();
      await page.keyboard.press('Home');
      await expect(radio(car, 0)).toBeChecked();
    });

    test('fade mode crossfades shadow cells via the active class', async ({ page }) => {
      await goto(page);
      const car = fadePair(page);
      await expect(car.locator('.carousel-item[data-i="0"]')).toHaveCSS('opacity', '1');
      await indicator(car, 2).click();
      await expect(car.locator('.carousel-item[data-i="2"]')).toHaveCSS('opacity', '1');
      await expect(car.locator('.carousel-item[data-i="0"]')).toHaveCSS('opacity', '0');
    });

    test('animation/orientation hot-swap on a live instance keeps navigating', async ({ page }) => {
      await goto(page);
      const car = main(page);
      await car.evaluate((el: Element) => {
        el.setAttribute('animation', 'fade');
        el.setAttribute('orientation', 'vertical');
      });
      await indicator(car, 2).click();
      await expect(radio(car, 2)).toBeChecked();
      await car.evaluate((el: Element) => {
        el.setAttribute('animation', 'slide');
        el.setAttribute('orientation', 'horizontal');
      });
      await car.locator('.carousel-controls .carousel-control-next:visible').click();
      await expect(radio(car, 3)).toBeChecked();
      await expect(slideImg(car, 3)).toBeInViewport();
    });

    test('slides top-align in horizontal slide mode and centre in fade/vertical', async ({ page }) => {
      // The demo images have different aspect ratios, so their rendered
      // heights differ by ~165px at the same width. The viewport tracks the
      // CURRENT slide while the flex track stretches to the TALLEST, so
      // centring in horizontal-slide mode parks each slide at its own offset
      // and the top edge jumps on every navigation (PRD §2.2b).
      await goto(page);
      const car = main(page);

      const gaps = async () =>
        car.evaluate((el: Element) => {
          const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
          const top = shadow.querySelector('.carousel-inner')!.getBoundingClientRect().top;
          return [...el.querySelectorAll(':scope > img')].map((img) =>
            Math.round(img.getBoundingClientRect().top - top));
        });

      // Horizontal slide: every slide flush with the viewport top (±1px of
      // subpixel rounding, which differs between engines).
      const slideGaps = await gaps();
      expect(slideGaps.length).toBeGreaterThan(1);
      slideGaps.forEach((gap) => expect(Math.abs(gap)).toBeLessThanOrEqual(1));

      // Fade: centred, so the shorter images sit lower than the tallest one.
      await car.evaluate((el: Element) => el.setAttribute('animation', 'fade'));
      const fadeGaps = await gaps();
      expect(Math.max(...fadeGaps)).toBeGreaterThan(0);

      // Vertical keeps its own contract: cells pinned to the tallest slide,
      // content centred inside them (column direction, so that is
      // justify-content — align-items is the horizontal axis there).
      await car.evaluate((el: Element) => {
        el.setAttribute('animation', 'slide');
        el.setAttribute('orientation', 'vertical');
      });
      const cellAlign = await car.evaluate((el: Element) => {
        const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
        const cell = shadow.querySelector('.carousel-item')!;
        const style = getComputedStyle(cell);
        return { dir: style.flexDirection, justify: style.justifyContent };
      });
      expect(cellAlign).toEqual({ dir: 'column', justify: 'center' });
    });

    test('the ARIA contract holds on the hydrated tree', async ({ page }) => {
      await goto(page);
      const car = main(page);
      await expect(car).toHaveAttribute('role', 'region');
      await expect(car).toHaveAttribute('aria-roledescription', 'carousel');
      const viewport = car.locator('.carousel-inner');
      await expect(viewport).toHaveAttribute('tabindex', '0');
      await expect(viewport).toHaveAttribute('aria-orientation', 'horizontal');
      await expect(viewport).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End');
      // paused ⇒ polite
      await expect(viewport).toHaveAttribute('aria-live', 'polite');
      const cell = car.locator('.carousel-item[data-i="1"]');
      await expect(cell).toHaveAttribute('role', 'group');
      await expect(cell).toHaveAttribute('aria-roledescription', 'slide');
      await expect(cell).toHaveAttribute('aria-label', '2 of 6');
      await expect(cell).toHaveAttribute('aria-hidden', 'true');
    });

    if (options.nested) {
      test('nested: inner horizontal arrows do not drive the vertical outer', async ({ page }) => {
        await goto(page);
        const outer = page.locator('mp-carousel[aria-label="Outer vertical"]');
        const inner = page.locator('mp-carousel[aria-label="Inner horizontal"]');
        // .first(): piercing locators reach into the nested carousel's shadow
        // too, so the outer's own viewport must be disambiguated by tree order.
        await inner.locator('.carousel-inner').first().focus();
        await page.keyboard.press('ArrowRight');
        await expect(radio(inner, 1)).toBeChecked();
        await expect(radio(outer, 0)).toBeChecked(); // outer untouched
        // ArrowDown is off-axis for the inner and must not move it either;
        // it also must NOT leak into the outer (keydown target guard).
        await page.keyboard.press('ArrowDown');
        await expect(radio(inner, 1)).toBeChecked();
        await expect(radio(outer, 0)).toBeChecked();
        // The outer navigates from its own viewport (.first() — see above).
        await outer.locator('.carousel-inner').first().focus();
        await page.keyboard.press('ArrowDown');
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

  test.describe('carousel (no JS, DSD)', () => {
    // The state machine is what's under test, not transition smoothness:
    // reduced motion collapses the CSS transitions (the component honours it),
    // which keeps Playwright's stability checks deterministic on cold servers.
    test.use({ reducedMotion: 'reduce' });

    // No `waitForLoadState('networkidle')`: the dev server holds an HMR
    // websocket open, so the network never goes idle and the wait burns its
    // full timeout on Firefox. Nothing here needs it either — everything
    // under test is in the server-rendered HTML, `goto` already waits for
    // `load`, and every assertion below auto-retries.
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('the DSD attaches server-side with the radio machine in place', async ({ page }) => {
      const car = fadePair(page);
      await expect(car.locator('.car-radio')).toHaveCount(3);
      await expect(radio(car, 0)).toBeChecked();
      await expect(car.locator('.carousel-indicators label')).toHaveCount(3);
      // Only the active slide's control pair is revealed.
      await expect(car.locator('.carousel-controls .carousel-control-next:visible')).toHaveCount(1);
    });

    test('fade: indicator labels flip radios and crossfade the slides', async ({ page }) => {
      const car = fadePair(page);
      await expect(slideImg(car, 0)).toHaveCSS('opacity', '1');
      await expect(slideImg(car, 2)).toHaveCSS('opacity', '0');
      await indicator(car, 2).click();
      await expect(radio(car, 2)).toBeChecked();
      await expect(slideImg(car, 2)).toHaveCSS('opacity', '1');
      await expect(slideImg(car, 0)).toHaveCSS('opacity', '0');
    });

    test('slide: prev/next labels translate the strip and wrap around', async ({ page }) => {
      const car = slidePair(page);
      // The pair sits below the fold; nothing auto-scrolls before the first
      // geometric assertion (later clicks scroll on their own).
      await car.scrollIntoViewIfNeeded();
      await expect(slideImg(car, 0)).toBeInViewport();
      await car.locator('.carousel-controls .carousel-control-next:visible').click();
      await expect(radio(car, 1)).toBeChecked();
      await expect(slideImg(car, 1)).toBeInViewport();
      await expect(slideImg(car, 0)).not.toBeInViewport();
      // wrap: prev, prev again from slide 0 lands on the last slide
      await car.locator('.carousel-controls .carousel-control-prev:visible').click();
      await expect(radio(car, 0)).toBeChecked();
      await car.locator('.carousel-controls .carousel-control-prev:visible').click();
      await expect(radio(car, 2)).toBeChecked();
      await expect(slideImg(car, 2)).toBeInViewport();
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

    test('two carousels on one page keep independent state (shadow-scoped radios)', async ({ page }) => {
      // Master's latent bug was ONE page-global name="car" radio group:
      // navigating any carousel deactivated the others. Shadow roots scope
      // the groups, so checking one carousel's radio must leave every other
      // carousel's checked radio alone. A single action + pure assertions —
      // per-carousel navigation behavior has its own tests. (Deliberately no
      // second cross-element ACTION: Chromium with JS disabled intermittently
      // hangs the actionability stability wait when switching action targets.)
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
      // No interactive-tier lies in the chrome: the viewport isn't focusable.
      await expect(car.locator('.carousel-inner')).not.toHaveAttribute('tabindex', '0');
    });
  });
}
