import { test } from '@playwright/test';

// Item 4, fallback path. Firefox's `<select>` dropdown is a UA widget with no DOM
// handle: its `<option>`s never lay out, so `getBoundingClientRect()` reports 0x0 and
// the popup's box is not scriptable. Run this HEADED (`--headed`) to see whether the
// popup is even rendered into the page's compositor — if it is not, the geometry is
// the platform's and no CSS in this repo can affect it, which is itself the verdict.
//
// Not part of narrow.spec.ts on purpose: it needs a head, so it must not run in the
// default sweep.

test('firefox native select popup: is it observable at all?', async ({ page, browserName }, info) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/harness.html');
  await page.waitForFunction(() => (window as any).__spikeReady === true);
  await page.evaluate(() => (window as any).spike.mount({}));

  const face = await page.evaluate(() => (window as any).spike.faceBox());
  await page.mouse.click(face.x + face.w / 2, face.y + face.h / 2);
  await page.waitForTimeout(800);

  const state = await page.evaluate(() => {
    const el = document.querySelector('#host mp-phone-input')!;
    const sel = el.shadowRoot!.querySelector('mp-select')!.shadowRoot!.querySelector('select')!;
    const opts = [...sel.querySelectorAll('option')];
    const laidOut = opts.filter((o) => o.getBoundingClientRect().width > 0).length;
    let open: boolean | null = null;
    try {
      open = sel.matches(':open');
    } catch {
      open = null;
    }
    return {
      open,
      laidOut,
      optionCount: opts.length,
      selectBox: sel.getBoundingClientRect().width,
      // If the popup were in-page it would be in the top layer; nothing in the
      // document reports it either way, which is the point.
      topLayerCandidates: document.querySelectorAll(':popover-open, dialog[open]').length,
    };
  });
  console.log(`[measure] 4-headed/${browserName} nativePopup ${JSON.stringify(state)}`);
  await page.screenshot({ path: `${__dirname}/shots/native-popup-headed-${info.project.name}.png` });
});
