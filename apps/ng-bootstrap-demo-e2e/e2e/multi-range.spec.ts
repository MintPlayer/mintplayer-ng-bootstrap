import { test, expect, Page } from '@playwright/test';

// The multi-range slider (#437): every thumb is a native <input type="range">
// stacked over one track, so the browser owns the keyboard and its RTL
// mirroring. Positions are read from each thumb's tooltip, which the scoped
// sheet centres over the thumb from the same fraction (it keeps its box while
// hidden). Covered here:
//   1. Geometric: in RTL the lower value sits on the RIGHT half of the track.
//   2. Behavioural: arrows on a focused RTL thumb move value and position together.
//   3. A press on the bare track moves the nearest thumb there (the core's own code).

interface SliderInfo {
  trackLeft: number;
  trackRight: number;
  trackWidth: number;
  thumbs: { value: number; centerX: number }[];
}

const slider = (label: string) => `bs-multi-range[aria-label="${label}"]`;

async function readSlider(page: Page, label: string): Promise<SliderInfo> {
  return await page.evaluate((selector) => {
    const host = document.querySelector(selector);
    if (!host) throw new Error(`${selector} not found`);
    const track = host.querySelector('.multi-range-track');
    if (!track) throw new Error('.multi-range-track not rendered');
    const rect = track.getBoundingClientRect();
    const inputs = Array.from(host.querySelectorAll<HTMLInputElement>('input.multi-range-thumb'));
    const tips = Array.from(host.querySelectorAll('.multi-range-tooltip'));
    return {
      trackLeft: rect.left,
      trackRight: rect.right,
      trackWidth: rect.width,
      thumbs: inputs.map((input, i) => {
        const tip = tips[i].getBoundingClientRect();
        return { value: Number(input.value), centerX: tip.left + tip.width / 2 };
      }),
    };
  }, slider(label));
}

test.describe('multi-range', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basic/forms/multi-range');
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
      /* HMR keeps the socket open, so the network never idles: settle briefly, never hang */
    });
    await expect(page.locator(`${slider('RTL range')} input.multi-range-thumb`)).toHaveCount(2);
    // The inputs work natively from the server HTML; the fill and tooltips follow
    // them only once the core is live, which the geometry assertions depend on.
    await page.locator(`${slider('RTL range')}[data-mp-hydrated]`).waitFor({ state: 'attached' });
  });

  test('thumbs flip to right-anchored positions in RTL', async ({ page }) => {
    const ltr = await readSlider(page, 'Basic range'); // [20, 80]
    const rtl = await readSlider(page, 'RTL range'); // [15, 85]

    expect(ltr.thumbs[0].centerX - ltr.trackLeft).toBeLessThan(ltr.trackWidth / 2);
    expect(ltr.thumbs[1].centerX - ltr.trackLeft).toBeGreaterThan(ltr.trackWidth / 2);

    expect(rtl.thumbs[0].centerX - rtl.trackLeft).toBeGreaterThan(rtl.trackWidth / 2);
    expect(rtl.thumbs[1].centerX - rtl.trackLeft).toBeLessThan(rtl.trackWidth / 2);
  });

  test('ArrowLeft on a focused RTL thumb increases value AND moves it leftward', async ({ page }) => {
    const before = await readSlider(page, 'RTL range');
    expect(before.thumbs[0].value).toBe(15);

    await page.locator(`${slider('RTL range')} input.multi-range-thumb`).first().focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');

    const after = await readSlider(page, 'RTL range');
    expect(after.thumbs[0].value).toBe(18);
    expect(after.trackRight - after.thumbs[0].centerX).toBeGreaterThan(before.trackRight - before.thumbs[0].centerX);
  });

  test('ArrowRight on a focused RTL thumb decreases value AND moves it rightward', async ({ page }) => {
    const before = await readSlider(page, 'RTL range');
    expect(before.thumbs[1].value).toBe(85);

    await page.locator(`${slider('RTL range')} input.multi-range-thumb`).nth(1).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    const after = await readSlider(page, 'RTL range');
    expect(after.thumbs[1].value).toBe(83);
    expect(after.trackRight - after.thumbs[1].centerX).toBeLessThan(before.trackRight - before.thumbs[1].centerX);
  });

  test('a press on the bare track moves the nearest thumb there and focuses it', async ({ page }) => {
    const before = await readSlider(page, 'Basic range');
    expect(before.thumbs.map((t) => t.value)).toEqual([20, 80]);
    const track = await page.locator(`${slider('Basic range')} .multi-range-track`).boundingBox();
    if (!track) throw new Error('track has no box');

    await page.mouse.click(track.x + track.width * 0.65, track.y + track.height / 2);

    const after = await readSlider(page, 'Basic range');
    expect(after.thumbs[0].value).toBe(20);
    expect(Math.abs(after.thumbs[1].value - 65)).toBeLessThanOrEqual(3);
    await expect(page.locator(`${slider('Basic range')} input.multi-range-thumb`).nth(1)).toBeFocused();
  });
});
