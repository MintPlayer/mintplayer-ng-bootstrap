import { test, expect, Locator, Page } from '@playwright/test';
// Regression coverage for the multi-range slider's RTL rendering. The original
// bug: thumbs and fill rendered with `left: V%` (LTR-anchored) while the
// pointer/keyboard math flipped for RTL — so dragging a thumb LEFT in RTL
// made its value increase but the thumb visually moved RIGHT. The fix
// switched the inline style to logical `inset-inline-start` and added a
// `:dir(rtl)` rule that flips the centering transform.
//
// We assert at two layers so a regression at either layer fails the spec:
//   1. Geometric — thumb at the lower value sits on the RIGHT half of the
//      track in RTL (and on the LEFT half in LTR).
//   2. Behavioural — pressing ArrowLeft on a focused thumb in RTL increases
//      its value AND visually moves it leftward.

interface ThumbInfo {
  index: number;
  value: number;
  centerX: number;
}

interface SliderInfo {
  trackLeft: number;
  trackRight: number;
  trackWidth: number;
  thumbs: ThumbInfo[];
}

async function readSlider(page: Page, ariaLabel: string): Promise<SliderInfo> {
  return await page.evaluate((label) => {
    const wc = document.querySelector(`mp-multi-range[aria-label="${label}"]`);
    if (!wc) throw new Error(`mp-multi-range[aria-label="${label}"] not found`);
    const shadow = wc.shadowRoot;
    if (!shadow) throw new Error('shadowRoot missing — element did not upgrade');
    const trackEl = shadow.querySelector('.track');
    if (!trackEl) throw new Error('.track not in shadow root');
    const trackRect = trackEl.getBoundingClientRect();
    const thumbEls = Array.from(shadow.querySelectorAll('.thumb'));
    return {
      trackLeft: trackRect.left,
      trackRight: trackRect.right,
      trackWidth: trackRect.width,
      thumbs: thumbEls.map((t, i) => {
        const rect = t.getBoundingClientRect();
        return {
          index: i,
          value: Number(t.getAttribute('aria-valuenow')),
          centerX: rect.left + rect.width / 2,
        };
      }),
    };
  }, ariaLabel);
}

async function focusThumb(page: Page, ariaLabel: string, index: number): Promise<void> {
  await page.evaluate(({ label, idx }) => {
    const wc = document.querySelector(`mp-multi-range[aria-label="${label}"]`);
    const thumb = wc?.shadowRoot?.querySelectorAll('.thumb')[idx] as HTMLElement;
    thumb?.focus();
  }, { label: ariaLabel, idx: index });
}

test.describe('multi-range — RTL rendering and behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basic/forms/multi-range');
    // Per project_e2e_destructive_bootstrap memory: SSR demo needs networkidle
    // after goto so destructive bootstrap finishes wiring up the page.
    await page.waitForLoadState('networkidle');
  });

  test('thumbs flip to right-anchored positions in RTL', async ({ page }) => {
    const ltr = await readSlider(page, 'Basic range'); // values [20, 80] — LTR
    const rtl = await readSlider(page, 'RTL range');   // values [15, 85] — RTL

    // LTR: lower-value thumb is on the LEFT half of the track.
    const ltrLowerOffset = ltr.thumbs[0].centerX - ltr.trackLeft;
    const ltrUpperOffset = ltr.thumbs[1].centerX - ltr.trackLeft;
    expect(ltrLowerOffset).toBeLessThan(ltr.trackWidth / 2);
    expect(ltrUpperOffset).toBeGreaterThan(ltr.trackWidth / 2);

    // RTL: lower-value thumb (15) must sit on the RIGHT half of the track,
    // upper-value thumb (85) on the LEFT half. This is the regression.
    const rtlLowerOffsetFromLeft = rtl.thumbs[0].centerX - rtl.trackLeft;
    const rtlUpperOffsetFromLeft = rtl.thumbs[1].centerX - rtl.trackLeft;
    expect(rtlLowerOffsetFromLeft).toBeGreaterThan(rtl.trackWidth / 2);
    expect(rtlUpperOffsetFromLeft).toBeLessThan(rtl.trackWidth / 2);

    // Tighter check: in RTL, the geometric distance from the right edge of the
    // track should equal the value's percentage of the range. Tolerate 2px slop
    // for sub-pixel rounding.
    const rtl0FromRight = rtl.trackRight - rtl.thumbs[0].centerX;
    const rtl1FromRight = rtl.trackRight - rtl.thumbs[1].centerX;
    expect(rtl0FromRight).toBeCloseTo(rtl.trackWidth * 0.15, -1); // 15% from right ± 5px
    expect(rtl1FromRight).toBeCloseTo(rtl.trackWidth * 0.85, -1);
  });

  test('ArrowLeft on a focused RTL thumb increases value AND moves it leftward', async ({ page }) => {
    const before = await readSlider(page, 'RTL range');
    expect(before.thumbs[0].value).toBe(15);

    await focusThumb(page, 'RTL range', 0);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');

    const after = await readSlider(page, 'RTL range');
    // Step is 1 (default) so value should have moved 15 → 18.
    expect(after.thumbs[0].value).toBe(before.thumbs[0].value + 3);
    // ...AND the thumb visually moved leftward (further from the right edge).
    const beforeFromRight = before.trackRight - before.thumbs[0].centerX;
    const afterFromRight = after.trackRight - after.thumbs[0].centerX;
    expect(afterFromRight).toBeGreaterThan(beforeFromRight);
  });

  test('ArrowRight on a focused RTL thumb decreases value AND moves it rightward', async ({ page }) => {
    const before = await readSlider(page, 'RTL range');
    expect(before.thumbs[1].value).toBe(85);

    await focusThumb(page, 'RTL range', 1);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    const after = await readSlider(page, 'RTL range');
    expect(after.thumbs[1].value).toBe(before.thumbs[1].value - 2);
    // ...AND the thumb visually moved rightward (closer to the right edge).
    const beforeFromRight = before.trackRight - before.thumbs[1].centerX;
    const afterFromRight = after.trackRight - after.thumbs[1].centerX;
    expect(afterFromRight).toBeLessThan(beforeFromRight);
  });
});
