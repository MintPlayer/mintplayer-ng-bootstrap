import { test, expect } from '@playwright/test';

// The carousel stays usable with JavaScript fully disabled. The <mp-carousel>
// element is never defined or upgraded; the server-rendered Declarative Shadow
// DOM (injected by injectMpCarouselDsd) attaches at parse time and a pure-CSS
// machine takes over — mirroring the configured mode: `fade` uses in-shadow
// radios + indicator labels, `slide` a native scroll-snap strip. Runs the real
// SSR server (the e2e webServer) with scripting off.
test.use({ javaScriptEnabled: false });

test.beforeEach(async ({ page }) => {
  await page.goto('/basic/carousel');
  await page.waitForLoadState('networkidle');
});

test('fade carousel: indicator labels crossfade slides via pure CSS (no JS)', async ({ page }) => {
  const fade = page.locator('mp-carousel[animation="fade"]');
  await expect(fade).toHaveCount(1);

  // The DSD attached with no JS: its shadow radios + indicator labels exist.
  // (Playwright pierces open shadow roots with CSS.)
  await expect(fade.locator('input.nojs-radio')).toHaveCount(6);
  const dots = fade.locator('label.nojs-indicator');
  await expect(dots).toHaveCount(6);

  // Slotted slides are light-DOM children; the checked radio promotes exactly
  // one to opacity 1 (and in-flow), the rest to 0. `toHaveCSS` auto-retries, so
  // it waits out the 0.5s opacity crossfade rather than sampling mid-transition.
  const slides = fade.locator('> img');

  // Radio 0 checked by default → first slide visible.
  await expect(slides.nth(0)).toHaveCSS('opacity', '1');
  await expect(slides.nth(2)).toHaveCSS('opacity', '0');

  // Click the third indicator label: a native <label for> checks radio s2 — no
  // script — and the `:checked ~` rule crossfades to the third slide.
  await dots.nth(2).click();
  await expect(slides.nth(2)).toHaveCSS('opacity', '1');
  await expect(slides.nth(0)).toHaveCSS('opacity', '0');
});

test('slide carousel: degrades to a horizontal scroll-snap strip (no JS)', async ({ page }) => {
  const slide = page.locator('mp-carousel[animation="slide"]').last();
  await expect(slide).toHaveCount(1);

  const inner = slide.locator('.carousel-inner');
  const style = await inner.evaluate((el) => {
    const s = getComputedStyle(el);
    return { overflowX: s.overflowX, scrollSnapType: s.scrollSnapType };
  });
  expect(['auto', 'scroll']).toContain(style.overflowX);
  expect(style.scrollSnapType).toContain('mandatory');

  // All slides are present and laid out in a row (no radios in slide mode).
  await expect(slide.locator('input.nojs-radio')).toHaveCount(0);
  await expect(slide.locator('> img')).toHaveCount(6);
});
