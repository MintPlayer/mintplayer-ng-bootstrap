import { test, expect, type Page } from '@playwright/test';

// Narrow-viewport spike for `mp-phone-input`. Every test prints a `[measure]` line;
// the verdicts in docs/prd/phone-input-wc.md are lifted from those lines, so the
// assertions here are deliberately loose — the numbers are the deliverable, not a
// pass/fail gate.

const WIDTHS = [320, 360, 390, 430] as const;

type Measure = {
  viewport: { w: number; h: number };
  host: Box;
  group: Box;
  items: { select: Box; addon: Box; input: Box };
  innerSelect: Box | null;
  faceButton: Box | null;
  rows: number;
  rowTops: number[];
  strays: unknown[];
  overflowsHost: boolean;
  pageOverflowX: number;
  innerSelectClipped: boolean | null;
  innerSelectTextOverflow: string | null;
  corners: Record<'select' | 'addon' | 'input', Corners>;
  innerSelectCorners: Corners | null;
  rich: boolean;
  groupWrap: string;
};
type Box = { x: number; y: number; w: number; h: number; right: number; bottom: number };
type Corners = { tl: string; tr: string; br: string; bl: string; ml: string; mt: string; mr: string };

const log = (label: string, value: unknown) =>
  console.log(`[measure] ${label} ${JSON.stringify(value)}`);

async function open(page: Page, width: number) {
  await page.setViewportSize({ width, height: 720 });
  await page.goto('/harness.html');
  await page.waitForFunction(() => (window as any).__spikeReady === true);
  await page.evaluate(() => (window as any).spike.mount({}));
}

/** Flags in, so a picker measured twice does not change width between measurements. */
const warm = (page: Page) => page.evaluate(() => (window as any).spike.warm());

/**
 * Open the country picker with a real mouse click on its closed face. Deliberately
 * not `showPicker()`: WebKit 26.4 has no `HTMLSelectElement.showPicker`, and a
 * native popup cannot be opened by any synthetic event.
 */
async function openPicker(page: Page) {
  const face = await page.evaluate(() => (window as any).spike.faceBox());
  await page.mouse.click(face.x + face.w / 2, face.y + face.h / 2);
  await page.waitForTimeout(300);
  return page.evaluate(() => (window as any).spike.isOpen());
}

async function closePicker(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

const measure = (page: Page) => page.evaluate(() => (window as any).spike.measure()) as Promise<Measure>;
const variant = (page: Page, names: string[]) =>
  page.evaluate((n) => (window as any).spike.variant(n), names);

/** One compact row per viewport: the numbers a stylesheet author actually needs. */
const summarise = (m: Measure) => ({
  vw: m.viewport.w,
  host: m.host.w,
  rows: m.rows,
  rowTops: m.rowTops,
  select: m.items.select.w,
  innerSelect: m.innerSelect?.w ?? null,
  addon: m.items.addon.w,
  input: m.items.input.w,
  inputRow: m.items.input.y,
  selectOverflowsHost: m.overflowsHost,
  selectRight: m.items.select.right,
  hostRight: m.host.right,
  pageOverflowX: m.pageOverflowX,
  faceClipped: m.innerSelectClipped,
  faceTextOverflow: m.innerSelectTextOverflow,
  rich: m.rich,
  wrap: m.groupWrap,
});

test.describe('1. the wrap itself', () => {
  for (const width of WIDTHS) {
    test(`baseline @${width}`, async ({ page }, info) => {
      await open(page, width);
      const m = await measure(page);
      log(`1/${info.project.name}/${width} baseline`, summarise(m));
      log(`1/${info.project.name}/${width} corners`, m.corners);
      log(`1/${info.project.name}/${width} innerSelectCorners`, m.innerSelectCorners);
      log(`1/${info.project.name}/${width} strays`, m.strays);
      expect(m.host.w).toBeGreaterThan(0);
    });
  }

  test('widest width at which it still fits on one row', async ({ page }, info) => {
    // Binary-search the breakpoint instead of guessing it: the answer is a function
    // of the widest country label, which differs per engine font stack.
    await open(page, 1200);
    let lo = 200;
    let hi = 1200;
    const rowsAt = async (w: number) => {
      await page.setViewportSize({ width: w, height: 720 });
      await page.evaluate(() => (window as any).spike.settle());
      return (await measure(page)).rows;
    };
    if ((await rowsAt(hi)) > 1) {
      log(`1/${info.project.name} breakpoint`, { note: 'wraps even at 1200px' });
      return;
    }
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if ((await rowsAt(mid)) > 1) lo = mid;
      else hi = mid;
    }
    log(`1/${info.project.name} breakpoint`, { wrapsAtOrBelow: lo, singleRowAtOrAbove: hi });
  });
});

test.describe('2. flex-wrap: nowrap', () => {
  for (const width of WIDTHS) {
    test(`nowrap @${width}`, async ({ page }, info) => {
      await open(page, width);
      await variant(page, ['nowrap']);
      const m = await measure(page);
      log(`2/${info.project.name}/${width} nowrap`, summarise(m));
      log(`2/${info.project.name}/${width} nowrap-corners`, m.corners);
    });
  }

  for (const width of [320, 430] as const) {
    test(`nowrap + narrow trigger @${width}`, async ({ page }, info) => {
      await open(page, width);
      await variant(page, ['nowrap', 'narrowHost']);
      log(`2/${info.project.name}/${width} nowrap+narrowHost`, summarise(await measure(page)));
      await variant(page, ['narrowInner']);
      log(`2/${info.project.name}/${width} nowrap+narrowHost+narrowInner`, summarise(await measure(page)));
    });
  }
});

test.describe('3. trigger width', () => {
  test('native <select> intrinsic width by label shape', async ({ page }, info) => {
    await open(page, 320);
    for (const mode of ['full', 'nameOnly', 'isoDial', 'iso'] as const) {
      const probe = await page.evaluate((m) => (window as any).spike.nativeProbe(m), mode);
      log(`3/${info.project.name} nativeProbe/${mode}`, {
        count: probe.count,
        longest: probe.longest,
        longestLen: probe.longestLen,
        width: probe.box.w,
      });
    }
    const rich = await page.evaluate(() => (window as any).spike.supportsBaseSelect());
    log(`3/${info.project.name} supportsBaseSelect`, rich);
  });

  for (const width of WIDTHS) {
    test(`closed face @${width}`, async ({ page }, info) => {
      await open(page, width);
      const m = await measure(page);
      log(`3/${info.project.name}/${width} closedFace`, {
        rich: m.rich,
        mpSelect: m.items.select.w,
        innerSelect: m.innerSelect?.w ?? null,
        faceButton: m.faceButton?.w ?? null,
        host: m.host.w,
        shareOfHost: m.host.w ? Math.round((m.items.select.w / m.host.w) * 100) : null,
      });
    });
  }

  test('explicit narrow width, host-only vs host+inner @320', async ({ page }, info) => {
    await open(page, 320);
    await variant(page, ['narrowHost']);
    log(`3/${info.project.name}/320 narrowHost`, summarise(await measure(page)));
    await page.screenshot({ path: `${__dirname}/shots/narrow-host-${info.project.name}-320.png` });
    await variant(page, ['narrowInner']);
    log(`3/${info.project.name}/320 narrowHost+narrowInner`, summarise(await measure(page)));
  });

  test('capped native face: does the clipped label get an ellipsis? @320', async ({ page }, info) => {
    await open(page, 320);
    await variant(page, ['narrowHost', 'faceEllipsis']);
    log(`3/${info.project.name}/320 narrowHost+faceEllipsis`, summarise(await measure(page)));
    await page.screenshot({ path: `${__dirname}/shots/face-ellipsis-${info.project.name}-320.png` });
  });
});

test.describe('4. picker overflow', () => {
  for (const width of [320, 430] as const) {
    test(`picker box @${width}`, async ({ page }, info) => {
      await open(page, width);
      const opened = await openPicker(page);
      const box = await page.evaluate(() => (window as any).spike.pickerBox());
      log(`4/${info.project.name}/${width} picker`, { opened, box });
      // A native popup is a UA widget with no JS handle. A screenshot is the only
      // evidence available for the fallback path, so capture one either way.
      await page.screenshot({ path: `${__dirname}/shots/picker-${info.project.name}-${width}.png` });
    });

    test(`picker box @${width} with cap`, async ({ page }, info) => {
      await open(page, width);
      await variant(page, ['pickerCap']);
      const opened = await openPicker(page);
      const box = await page.evaluate(() => (window as any).spike.pickerBox());
      log(`4/${info.project.name}/${width} picker+cap`, { opened, box });
      await page.screenshot({ path: `${__dirname}/shots/picker-cap-${info.project.name}-${width}.png` });
    });
  }
});

test.describe('5. container queries', () => {
  test('container-type on the phone host — does the group see it?', async ({ page }, info) => {
    // 1280 viewport, 300px host: the case a media query cannot express.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/harness.html');
    await page.waitForFunction(() => (window as any).__spikeReady === true);
    await page.evaluate(() => (window as any).spike.mount({ hostWidth: '300px' }));
    log(`5/${info.project.name} narrowHostWideViewport/before`, summarise(await measure(page)));

    await variant(page, ['cqEstablishPhone', 'cqConsumeInGroup', 'cqConsumeInPhone']);
    const m = await measure(page);
    log(`5/${info.project.name} narrowHostWideViewport/after`, summarise(m));
    log(`5/${info.project.name} containment`, await page.evaluate(() => (window as any).spike.containment()));
    log(`5/${info.project.name} crossBoundaryContainerQuery`, {
      groupRuleApplied: m.groupWrap === 'nowrap',
      phoneRuleApplied: m.items.select.w < 120,
    });
  });

  test('container-type on the group element only', async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/harness.html');
    await page.waitForFunction(() => (window as any).__spikeReady === true);
    await page.evaluate(() => (window as any).spike.mount({ hostWidth: '300px' }));
    await variant(page, ['cqEstablishGroup', 'cqConsumeInGroup']);
    const m = await measure(page);
    log(`5/${info.project.name} groupSelfContainer`, {
      ...summarise(m),
      containment: await page.evaluate(() => (window as any).spike.containment()),
    });
  });

  test('THE TRAP: does container-type reposition ::picker(select)?', async ({ page }, info) => {
    await open(page, 320);
    const openedBefore = await openPicker(page);
    const before = await page.evaluate(() => (window as any).spike.pickerBox());
    await closePicker(page);

    await variant(page, ['cqEstablishPhone']);
    const openedAfter = await openPicker(page);
    const after = await page.evaluate(() => (window as any).spike.pickerBox());
    await page.screenshot({ path: `${__dirname}/shots/picker-contained-${info.project.name}.png` });
    log(`5/${info.project.name} pickerUnderContainment`, {
      containment: await page.evaluate(() => (window as any).spike.containment()),
      openedBefore,
      openedAfter,
      before,
      after,
      moved:
        before.measurable && after.measurable
          ? { dx: after.union.x - before.union.x, dy: after.union.y - before.union.y, dw: after.union.w - before.union.w }
          : null,
    });
  });
});

test.describe('6. deliberate two-row stack', () => {
  test('naive overrides lose to the group\'s (0,3,1) pairing rules @320', async ({ page }, info) => {
    await open(page, 320);
    await variant(page, ['stackNaive']);
    const m = await measure(page);
    log(`6/${info.project.name}/320 naive-corners`, m.corners);
    log(`6/${info.project.name}/320 naive-strays`, m.strays);
    await page.screenshot({ path: `${__dirname}/shots/stacked-naive-${info.project.name}-320.png` });
  });

  for (const width of [320, 390] as const) {
    test(`stacked @${width}`, async ({ page }, info) => {
      await open(page, width);
      await variant(page, ['stack', 'stackSelect']);
      const m = await measure(page);
      log(`6/${info.project.name}/${width} stacked`, summarise(m));
      log(`6/${info.project.name}/${width} stacked-corners`, m.corners);
      log(`6/${info.project.name}/${width} stacked-innerSelectCorners`, m.innerSelectCorners);
      log(`6/${info.project.name}/${width} stacked-strays`, m.strays);
      await page.screenshot({ path: `${__dirname}/shots/stacked-${info.project.name}-${width}.png` });
    });
  }
});
