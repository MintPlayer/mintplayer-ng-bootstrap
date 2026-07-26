import { test, expect, type Page, type Locator } from '@playwright/test';

// Phase-0 spikes for the carousel WC migration (docs/prd/carousel-wc.md §8).
// Throwaway — deleted before merge; only the verdicts flow back into the PRD.

async function box(l: Locator) {
  const b = await l.boundingBox();
  expect(b, 'element should have a box').not.toBeNull();
  return b!;
}

// ---------------------------------------------------------------------------
// S1 — per-slide cell projection
// ---------------------------------------------------------------------------
test.describe('S1 projection', () => {
  for (const kind of ['stamp', 'manual'] as const) {
    test(`${kind}: each light-DOM slide lands in its own shadow cell`, async ({ page }) => {
      await page.goto('/s1-projection.html');
      const host = page.locator(`#${kind}`);
      await expect(host).toHaveAttribute('data-synced', '3');

      // Geometric proof: cells are 100%-wide flex children, so slide i sits at x0 + i*300.
      const a = await box(page.locator(`#${kind[0] === 's' ? 'st' : 'mn'}-a`));
      const b = await box(page.locator(`#${kind[0] === 's' ? 'st' : 'mn'}-b`));
      const c = await box(page.locator(`#${kind[0] === 's' ? 'st' : 'mn'}-c`));
      expect(Math.round(b.x - a.x)).toBe(300);
      expect(Math.round(c.x - b.x)).toBe(300);

      // Structural proof via assignedSlot.
      const assigned = await host.evaluate((el: HTMLElement) =>
        [...el.children].map((k) => (k as HTMLElement).assignedSlot != null));
      expect(assigned.every(Boolean)).toBe(true);

      // Reactive add: a 4th slide gets its own cell.
      await host.evaluate((el: HTMLElement) => {
        const d = document.createElement('div');
        d.className = 'slide d';
        d.id = `${el.id}-d`;
        d.textContent = 'D';
        el.appendChild(d);
      });
      await expect(host).toHaveAttribute('data-synced', '4');
      const d = await box(page.locator(`#${kind}-d`));
      expect(Math.round(d.x - c.x)).toBe(300);

      // Reactive remove: cells re-pack.
      await host.evaluate((el: HTMLElement) => el.children[0].remove());
      await expect(host).toHaveAttribute('data-synced', '3');
      const bAfter = await box(page.locator(`#${kind[0] === 's' ? 'st' : 'mn'}-b`));
      expect(Math.round(bAfter.x)).toBe(Math.round(a.x));
    });
  }

  test('manual: an unassigned child renders nothing', async ({ page }) => {
    await page.goto('/s1-projection.html');
    const host = page.locator('#manual');
    await expect(host).toHaveAttribute('data-synced', '3');
    // Empty out the first slot's assignment directly.
    await host.evaluate((el: HTMLElement) => {
      const slot = el.shadowRoot!.querySelector('slot') as HTMLSlotElement;
      slot.assign();
    });
    const bb = await page.locator('#mn-a').boundingBox();
    expect(bb === null || bb.width === 0 || bb.height === 0).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// S2 — DSD radio chrome with JS disabled (Tier-1 interactivity, pre-upgrade)
// ---------------------------------------------------------------------------
test.describe('S2 no-JS DSD tier', () => {
  test.use({ javaScriptEnabled: false });

  test('DSD attaches, radios drive crossfade, controls + indicators work, wrap-around works', async ({ page }) => {
    await page.goto('/s2-handover.html');
    const car = page.locator('#car');
    await expect(car.locator('.stack')).toHaveCount(1); // shadow pierced = DSD attached

    const r = (i: number) => car.locator(`#r${i}`);
    const slide = (i: number) => page.locator(`#sl-${i}`);
    await expect(r(0)).toBeChecked();
    await expect(slide(0)).toHaveCSS('opacity', '1');
    await expect(slide(2)).toHaveCSS('opacity', '0');

    // Indicator jumps to slide 3.
    await car.locator('.indicators [for="r2"]').click();
    await expect(r(2)).toBeChecked();
    await expect(slide(2)).toHaveCSS('opacity', '1');
    await expect(slide(0)).toHaveCSS('opacity', '0');

    // Wrap-around: "next" from the last slide lands on slide 1.
    await car.locator('.controls .n2').click();
    await expect(r(0)).toBeChecked();

    // "prev" from the first slide wraps to the last.
    await car.locator('.controls .p0').click();
    await expect(r(2)).toBeChecked();
  });

  test('keyboard: radiogroup arrows change slides with JS off', async ({ page }) => {
    await page.goto('/s2-handover.html');
    const car = page.locator('#car');
    // The checked radio is the tab stop for the group.
    await page.keyboard.press('Tab');
    await expect(car.locator('#r0')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(car.locator('#r1')).toBeChecked();
    await page.keyboard.press('ArrowDown');
    await expect(car.locator('#r2')).toBeChecked();
    await page.keyboard.press('ArrowRight'); // native radio groups wrap
    await expect(car.locator('#r0')).toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// S2 — upgrade handover (JS enabled)
// ---------------------------------------------------------------------------
test.describe('S2 upgrade handover', () => {
  test('pre-upgrade state survives; no duplicate chrome; per-slide cells take over', async ({ page }) => {
    await page.goto('/s2-handover.html');
    const car = page.locator('#car');

    // Pre-upgrade: pure DSD is interactive (JS is on, but the element is undefined).
    await car.locator('.indicators [for="r1"]').click();
    await expect(car.locator('#r1')).toBeChecked();

    await page.evaluate(() => (window as unknown as { __define(): void }).__define());
    await expect(car).toHaveAttribute('data-js', '');

    // Exactly one of each chrome piece — nothing duplicated, DSD stack gone.
    await expect(car.locator('.track')).toHaveCount(1);
    await expect(car.locator('.stack')).toHaveCount(0);
    await expect(car.locator('.cell')).toHaveCount(3);
    await expect(car.locator('.indicators')).toHaveCount(1);

    // The pre-upgrade slide (index 1) survived the handover.
    await expect(car.locator('#r1')).toBeChecked();
    await expect(page.locator('#sl-1')).toBeInViewport();
    const gone = await page.locator('#sl-0').boundingBox();
    const viewport = await box(car.locator('.viewport'));
    expect(gone!.x + gone!.width).toBeLessThanOrEqual(viewport.x + 1); // shifted out left

    // Slides are slot-assigned into cells.
    const slots = await car.evaluate((el: HTMLElement) =>
      [...el.children].map((k) => k.getAttribute('slot')));
    expect(slots).toEqual(['s0', 's1', 's2']);

    // Post-upgrade the radios still drive the (now translating) track.
    await car.locator('.indicators [for="r2"]').click();
    await expect(page.locator('#sl-2')).toBeInViewport();
  });
});

// ---------------------------------------------------------------------------
// S3 — wrap-around without cloneNode
// ---------------------------------------------------------------------------
test.describe('S3 wrap via slot reassignment', () => {
  test('slide 0 teleports to the after-last cell during the wrap, then snaps home', async ({ page }) => {
    await page.goto('/s3-wrap.html');
    const host = page.locator('#wrap');
    await page.evaluate(() => (window as unknown as { __wrap(): void }).__wrap());

    // Mid-flight (400ms transition): slide 0's light node is assigned to the wrap cell.
    await expect
      .poll(() => host.evaluate((el: HTMLElement) => el.children[0].getAttribute('slot')))
      .toBe('wrapA');

    await expect(host).toHaveAttribute('data-committed', '', { timeout: 5000 });

    // Committed: back in its own cell, track snapped to 0, slide 0 visible.
    expect(await host.evaluate((el: HTMLElement) => el.children[0].getAttribute('slot'))).toBe('s0');
    await expect(page.locator('#w-0')).toBeInViewport();
    // No clones: still exactly 3 light-DOM children, and the wrap cell is empty.
    expect(await host.evaluate((el: HTMLElement) => el.childElementCount)).toBe(3);
    expect(await host.evaluate((el: HTMLElement) =>
      (el.shadowRoot!.querySelector('.wrap-after slot') as HTMLSlotElement).assignedNodes().length)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// S4 — radio-driven translate with JS disabled
// ---------------------------------------------------------------------------
test.describe('S4 no-JS translate', () => {
  test.use({ javaScriptEnabled: false });

  test('horizontal: indicators + prev/next translate the track; only the active slide is in view', async ({ page }) => {
    await page.goto('/s4-nojs-translate.html');
    await expect(page.locator('#hs-0')).toBeInViewport();

    await page.locator('.ind [for="h1"]').click();
    await expect(page.locator('#h1')).toBeChecked();
    await expect(page.locator('#hs-1')).toBeInViewport();
    await expect(page.locator('#hs-0')).not.toBeInViewport();

    // next from 1 → 2, next from 2 wraps → 0
    await page.locator('.controls .n1').click();
    await expect(page.locator('#hs-2')).toBeInViewport();
    await page.locator('.controls .n2').click();
    await expect(page.locator('#hs-0')).toBeInViewport();

    // prev from 0 wraps → 2
    await page.locator('.controls .p0').click();
    await expect(page.locator('#hs-2')).toBeInViewport();
  });

  test('vertical: grid-auto-rows 1fr + calc translate moves exactly one cell', async ({ page }) => {
    await page.goto('/s4-nojs-translate.html');
    await expect(page.locator('#vs-0')).toBeInViewport();
    await page.locator('.vcarousel .ind [for="v1"]').click();
    await expect(page.locator('#vs-1')).toBeInViewport();
    await expect(page.locator('#vs-0')).not.toBeInViewport();
    await page.locator('.vcarousel .ind [for="v2"]').click();
    await expect(page.locator('#vs-2')).toBeInViewport();
    await expect(page.locator('#vs-1')).not.toBeInViewport();
  });
});
