import { test, expect, type Page } from '@playwright/test';
import { decodePng, firstDarkColumn, hasSaturatedColour, nonWhiteColumns } from './png';

// Every number this spike reports is printed with an `S2.x` tag so the verdict
// table can be assembled from the run log.
const log = (tag: string, engine: string, payload: unknown) =>
  console.log(`\n[${tag}] ${engine} :: ${JSON.stringify(payload, null, 1)}`);

async function boot(page: Page) {
  await page.goto('/s2.html');
  await page.waitForFunction(() => (window as any).__harnessReady === true);
}

const env = async (page: Page) =>
  page.evaluate(() => ({
    ua: navigator.userAgent,
    supportsBaseSelect: CSS.supports('appearance', 'base-select'),
    supportsPickerPseudo: CSS.supports('selector(::picker(select))'),
    hasSelectedContent: 'HTMLSelectedContentElement' in window,
    hasShowPicker: 'showPicker' in HTMLSelectElement.prototype,
  }));

const rAF2 = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/**
 * Opens the picker with a real click on the select's closed face. Only call this
 * where base-select is active: a *native* popup in headless Firefox/WebKit is not
 * scriptable, and WebKit has no `HTMLSelectElement.showPicker()` at all.
 */
async function openPicker(page: Page) {
  const pt = await page.evaluate(() => {
    const r = (window as any).__case.select.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(pt.x, pt.y);
  await rAF2(page);
}

/**
 * Screenshots a clip and reports the device-pixel-to-CSS-pixel scale, so pixel
 * measurements are comparable across engines — `devices['Desktop Safari']` runs at
 * deviceScaleFactor 2, which silently doubles every column index.
 */
async function clipShot(page: Page, box: { x: number; y: number; width: number; height: number }) {
  const img = decodePng(await page.screenshot({ clip: box }));
  return { img, scale: img.width / box.width };
}

const cssBox = (page: Page, what: 'select' | 'root', pad = 0) =>
  page.evaluate(({ w, p }) => {
    const r = (window as any).__case[w].getBoundingClientRect();
    return {
      x: Math.max(0, Math.floor(r.x) - p), y: Math.max(0, Math.floor(r.y) - p),
      width: Math.ceil(r.width) + 2 * p, height: Math.ceil(r.height) + 2 * p,
    };
  }, { w: what, p: pad });

/** Reads what the picker considers "current" — under base-select that is NOT `select.value`. */
const probeState = (page: Page) =>
  page.evaluate(() => {
    const c = (window as any).__case;
    const root: any = c.select.getRootNode();
    const active = root.activeElement;
    const focusedOption = active?.tagName === 'OPTION' ? active : null;
    const clean = (s: string | null | undefined) => s?.replace(/\s+/g, ' ').trim().slice(0, 40) ?? null;
    return {
      value: c.select.value,
      selectedText: clean(c.select.options[c.select.selectedIndex]?.textContent),
      focusedOptionValue: focusedOption?.value ?? null,
      focusedOptionText: clean(focusedOption?.textContent),
      open: (c.select as any).matches?.(':open') ?? null,
      changes: (window as any).__changes,
    };
  });

// ---------------------------------------------------------------------------
// S2.1 — does base-select survive one and two nested shadow roots?
// ---------------------------------------------------------------------------

test('S2.1 base-select in light DOM / 1 shadow root / 2 nested shadow roots', async ({ page, browserName }) => {
  await boot(page);
  const e = await env(page);
  log('S2.1-env', browserName, e);

  const results: any[] = [];
  for (const depth of [0, 1, 2] as const) {
    const r = await page.evaluate(async (d) => {
      const c = (window as any).buildCase({ depth: d, recipe: 'pairGated', rich: true, count: 8 });
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const cs = getComputedStyle(c.select);
      let n = 0, node: any = c.select.getRootNode();
      while (node && node.host) { n++; node = node.host.getRootNode(); }
      return {
        shadowDepth: n,
        appearance: cs.appearance,
        selectBox: (({ width, height }) => ({ w: +width.toFixed(2), h: +height.toFixed(2) }))(
          c.select.getBoundingClientRect(),
        ),
        selectedContentSvg: (() => {
          const svg = c.select.querySelector('selectedcontent svg');
          if (!svg) return null;
          const r2 = svg.getBoundingClientRect();
          return { w: +r2.width.toFixed(2), h: +r2.height.toFixed(2) };
        })(),
      };
    }, depth);

    let open: any = { skipped: 'no base-select support' };
    if (e.supportsBaseSelect) {
      await openPicker(page);
      open = await page.evaluate(() => {
        const c = (window as any).__case;
        const opts = [...c.select.querySelectorAll('option')];
        const rect = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
        };
        return {
          isOpen: c.select.matches(':open'),
          optionRect: rect(opts[1]),
          optionSvgRect: rect(opts[1].querySelector('svg')),
          optionNameRect: rect(opts[1].querySelector('.name')),
          optionsLaidOut: opts.filter((o: Element) => o.getBoundingClientRect().height > 0).length,
        };
      });
      await page.keyboard.press('Escape');
    }
    results.push({ depth, ...r, open });
  }
  log('S2.1', browserName, results);

  if (e.supportsBaseSelect) {
    for (const r of results) {
      expect.soft(r.appearance, `depth ${r.depth} appearance`).toBe('base-select');
      expect.soft(r.open.optionSvgRect?.w, `depth ${r.depth} option svg width`).toBeGreaterThan(0);
      expect.soft(r.open.optionsLaidOut, `depth ${r.depth} options laid out`).toBe(8);
    }
    expect.soft(results[2].shadowDepth, 'nested twice').toBe(2);
  }
});

// ---------------------------------------------------------------------------
// S2.2 — SVG inside <option>, <selectedcontent> mirroring, and what the
//        fallback engines do with the same rich markup
// ---------------------------------------------------------------------------

test('S2.2 inline svg in option + selectedcontent mirror + fallback behaviour', async ({ page, browserName }) => {
  await boot(page);
  const e = await env(page);
  const out: any[] = [];

  for (const authorButton of [true, false]) {
    await page.evaluate((ab) => (window as any).buildCase({ depth: 2, recipe: 'pairGated', rich: true, count: 8, authorButton: ab }), authorButton);
    await rAF2(page);
    const closed = await page.evaluate(() => {
      const c = (window as any).__case;
      const sc = c.select.querySelector('selectedcontent');
      const r = (el: Element | null) => (el ? (({ width, height }) => ({ w: +width.toFixed(2), h: +height.toFixed(2) }))(el.getBoundingClientRect()) : null);
      return {
        selectedContentPresent: !!sc,
        selectedContentSvg: r(sc?.querySelector('svg') ?? null),
        closedFaceSvgCount: [...c.select.querySelectorAll('svg')].filter((s) => s.getBoundingClientRect().height > 0).length,
        // What a fallback engine actually shows for rich markup: the concatenated
        // text of the option, with no separator between the spans.
        selectedOptionText: c.select.options[c.select.selectedIndex]?.textContent,
        selectedOptionLabelProp: (c.select.options[c.select.selectedIndex] as HTMLOptionElement)?.text,
      };
    });

    const { img, scale } = await clipShot(page, await cssBox(page, 'select'));
    out.push({
      authorButton, ...closed, scale,
      // a flag is saturated colour; text is not
      colouredClosedFace: hasSaturatedColour(img, { x1: Math.min(img.width, Math.round(40 * scale)) }),
      closedFaceInkColsCss: +(nonWhiteColumns(img, { y0: 3, y1: img.height - 3 }) / scale).toFixed(1),
    });
  }
  log('S2.2', browserName, { supportsBaseSelect: e.supportsBaseSelect, hasSelectedContent: e.hasSelectedContent, out });

  if (e.supportsBaseSelect) {
    expect.soft(out[0].selectedContentSvg?.w, 'author <button><selectedcontent> mirrors the svg').toBeGreaterThan(0);
    expect.soft(out[0].colouredClosedFace, 'closed face shows flag colour').toBe(true);
    // The UA-generated button does NOT mirror rich markup — a real constraint.
    expect.soft(out[1].selectedContentPresent, 'no author button -> no selectedcontent').toBe(false);
  }
});

// ---------------------------------------------------------------------------
// S2.3 — native semantics under base-select
// ---------------------------------------------------------------------------

test('S2.3 keyboard open/close, arrows, typeahead, Escape, change event', async ({ page, browserName }) => {
  await boot(page);
  const e = await env(page);

  const run = async (rich: boolean, recipe: string) => {
    await page.evaluate(({ r, rec }) => {
      (window as any).__changes = 0;
      const c = (window as any).buildCase({
        depth: 2, recipe: rec, rich: r, count: 244, locale: 'en', labelOrder: 'name-first',
      });
      c.select.value = 'AF';
    }, { r: rich, rec: recipe });
    await rAF2(page);

    const focus = () => page.evaluate(() => { (window as any).__case.select.focus(); (window as any).__changes = 0; });
    await focus();
    const focused = await page.evaluate(() => {
      const path: string[] = [];
      let a: any = document.activeElement;
      while (a) { path.push(a.tagName.toLowerCase()); a = a.shadowRoot?.activeElement; }
      return { path, isSelect: (window as any).__case.select.getRootNode().activeElement === (window as any).__case.select };
    });

    await page.keyboard.press('Enter');
    await rAF2(page);
    const afterEnter = await probeState(page);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await rAF2(page);
    const afterArrows = await probeState(page);

    // Typeahead inside the open picker. "germ" must reach Germany (DE) — chosen so
    // the ISO code shares no prefix with the country name.
    await page.keyboard.type('germ', { delay: 60 });
    await rAF2(page);
    const afterTypeahead = await probeState(page);

    await page.keyboard.press('Enter');
    await rAF2(page);
    const afterCommit = await probeState(page);

    await page.keyboard.press('Enter');
    await rAF2(page);
    await page.keyboard.press('Escape');
    await rAF2(page);
    const afterEscape = await probeState(page);

    // Typeahead on the CLOSED control, from a known different starting value.
    await page.evaluate(() => {
      const c = (window as any).__case;
      c.select.blur(); c.select.value = 'AF'; (window as any).__changes = 0;
    });
    await focus();
    await page.keyboard.type('germ', { delay: 60 });
    await rAF2(page);
    const closedTypeahead = await probeState(page);

    return { rich, recipe, focused, afterEnter, afterArrows, afterTypeahead, afterCommit, afterEscape, closedTypeahead };
  };

  const rows: any[] = [];
  if (e.supportsBaseSelect) rows.push(await run(true, 'pairGated'));
  rows.push(await run(false, 'none'));
  log('S2.3', browserName, rows);

  for (const r of rows) {
    // While a NATIVE popup is open the DOM exposes neither the active option nor a
    // provisional `select.value`, so the only cross-engine proof that typeahead
    // reached Germany is what Enter committed. Under base-select the active option
    // IS observable, and is asserted separately.
    // Asserted on the label, not the ISO code: `Intl.DisplayNames` maps both DE and
    // the deprecated DD to "Germany", and typeahead legitimately lands on the first.
    expect.soft(r.afterCommit.selectedText, `${r.recipe}: Enter committed the typeahead target`).toMatch(/^Germany/);
    expect.soft(r.afterCommit.changes, `${r.recipe}: change event fired`).toBeGreaterThanOrEqual(1);
    // A picker that opened commits ONCE, on Enter. A closed native select instead
    // fires `change` per keystroke that moves the selection — both are correct, but
    // only the first is assertable as "exactly one".
    if (r.recipe !== 'none') {
      expect.soft(r.afterCommit.changes, `${r.recipe}: exactly one change on commit`).toBe(1);
      expect.soft(r.afterEscape.open, `${r.recipe}: Escape closed the picker`).toBe(false);
    }
  }
  if (e.supportsBaseSelect) {
    const richRow = rows[0], nativeRow = rows[1];
    // The question is whether base-select REGRESSES closed-face typeahead, not
    // whether the engine has it: WebKit has none in either mode (macOS convention).
    const nativeHasClosedTypeahead = /^Germany/.test(nativeRow.closedTypeahead.selectedText ?? '');
    expect.soft(/^Germany/.test(richRow.closedTypeahead.selectedText ?? ''),
      `closed-face typeahead parity (native baseline: ${nativeHasClosedTypeahead})`)
      .toBe(nativeHasClosedTypeahead);
    expect.soft(richRow.afterTypeahead.focusedOptionText, 'base-select: typeahead moved the active option past the SVG').toMatch(/^Germany/);
    expect.soft(richRow.afterArrows.focusedOptionValue, 'base-select: arrows move the active option').toBe('AI');
    expect.soft(richRow.afterArrows.value, 'base-select: arrows do NOT commit a value').toBe('AF');
  }
});

test('S2.3b typeahead vs option label order (ISO-first breaks name typeahead)', async ({ page, browserName }) => {
  await boot(page);
  const rows: any[] = [];
  for (const labelOrder of ['iso-first', 'name-first'] as const) {
    await page.evaluate((lo) => {
      const c = (window as any).buildCase({ depth: 2, recipe: 'none', rich: false, count: 244, locale: 'en', labelOrder: lo });
      c.select.value = 'AF';
      (window as any).__changes = 0;
      c.select.focus();
    }, labelOrder);
    await rAF2(page);
    await page.keyboard.type('germ', { delay: 60 });
    await rAF2(page);
    const s = await probeState(page);
    rows.push({ labelOrder, typed: 'germ', ...s });
  }
  log('S2.3b', browserName, rows);

  expect.soft(rows.find((r) => r.labelOrder === 'name-first').selectedText, 'name-first reaches Germany').toMatch(/^Germany/);
  expect.soft(rows.find((r) => r.labelOrder === 'iso-first').selectedText, 'ISO-first cannot reach Germany by name').not.toMatch(/Germany/);
});

// ---------------------------------------------------------------------------
// S2.4 — closed-face layout metrics, base-select on vs off
// ---------------------------------------------------------------------------

test('S2.4 closed-face metrics with and without base-select', async ({ page, browserName }) => {
  await boot(page);
  const e = await env(page);

  const measure = async (recipe: string, rich: boolean, pinned = false) => {
    await page.evaluate(({ rec, r, pin }) => {
      const c = (window as any).buildCase({
        depth: 2, recipe: rec, rich: r, count: 244,
        // What mp-input-group will actually do: give the country picker a fixed
        // basis instead of letting it size to its content.
        extraCss: pin ? ':host { width: 7.5rem; } select.form-select { width: 100%; }' : '',
      });
      c.select.value = 'BE';
    }, { rec: recipe, r: rich, pin: pinned });
    await rAF2(page);
    const metrics = await page.evaluate(() => {
      const c = (window as any).__case;
      const cs = getComputedStyle(c.select);
      const b = c.select.getBoundingClientRect();
      const hb = c.root.getBoundingClientRect();
      const px = (v: string) => +parseFloat(v).toFixed(2);
      return {
        appearance: cs.appearance,
        select: { w: +b.width.toFixed(2), h: +b.height.toFixed(2) },
        host: { w: +hb.width.toFixed(2), h: +hb.height.toFixed(2) },
        padding: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
        border: px(cs.borderTopWidth),
        font: `${cs.fontSize}/${cs.lineHeight}`,
        borderRadius: cs.borderTopLeftRadius,
        bgImage: cs.backgroundImage === 'none' ? 'none' : 'bootstrap-caret',
      };
    });
    const { img, scale } = await clipShot(page, await cssBox(page, 'select'));
    const firstInk = firstDarkColumn(img, { x0: Math.round(2 * scale), y0: 3, y1: img.height - 3 });
    // How much ink is in the left 60 CSS px at all — distinguishes "text drawn but
    // light" from "text not drawn". Headless WebKit paints no text for a native
    // `<select>`, which would otherwise read as a layout finding.
    const leftInk = (() => {
      let n = 0;
      const x1 = Math.min(img.width, Math.round(60 * scale));
      for (let x = 0; x < x1; x++) {
        for (let y = 3; y < img.height - 3; y++) {
          const i = (y * img.width + x) * img.channels;
          if (255 - img.data[i] > 8 || 255 - img.data[i + 1] > 8 || 255 - img.data[i + 2] > 8) { n++; break; }
        }
      }
      return +(n / scale).toFixed(1);
    })();
    return { ...metrics, firstInkXCss: firstInk < 0 ? -1 : +(firstInk / scale).toFixed(1), left60InkColsCss: leftInk };
  };

  const rows = {
    intrinsic_off: await measure('none', false),
    intrinsic_onGated: e.supportsBaseSelect ? await measure('pairGated', true) : null,
    intrinsic_onUnfixed: e.supportsBaseSelect ? await measure('pairSpecific', true) : null,
    pinned_off: await measure('none', false, true),
    pinned_onGated: e.supportsBaseSelect ? await measure('pairGated', true, true) : null,
    // The negative control: ungated reconciliation, measured in EVERY engine.
    pinned_ungated: await measure('pairFixed', true, true),
  };
  log('S2.4', browserName, { supportsBaseSelect: e.supportsBaseSelect, ...rows });

  if (e.supportsBaseSelect) {
    expect.soft(Math.abs(rows.pinned_onGated!.select.w - rows.pinned_off.select.w), 'pinned width jump').toBeLessThanOrEqual(1);
    expect.soft(Math.abs(rows.pinned_onGated!.select.h - rows.pinned_off.select.h), 'pinned height jump').toBeLessThanOrEqual(1);
  } else {
    // Falsification target: ungated reconciliation must NOT reach a fallback engine.
    expect.soft(rows.pinned_ungated.bgImage, 'ungated recipe strips the caret in a fallback engine').toBe('none');
    expect.soft(rows.pinned_off.bgImage, 'gated/none keeps the Bootstrap caret').toBe('bootstrap-caret');
  }
});

// ---------------------------------------------------------------------------
// S2.5 — the aria-hidden / pointer-events:none flag overlay
// ---------------------------------------------------------------------------

test('S2.5 overlay: click-through, coverage, focus ring', async ({ page, browserName }) => {
  await boot(page);
  const e = await env(page);
  const rows: any[] = [];

  for (const mode of ['plain', 'cover', 'enhanced-off'] as const) {
    await page.evaluate((ov) => {
      const c = (window as any).buildCase({
        depth: 2, recipe: 'none', rich: false, count: 244, overlay: ov, overlayIndex: 20,
      });
      c.select.value = 'BE';
      (window as any).__hits = 0;
      c.select.addEventListener('pointerdown', () => { (window as any).__hits++; });
      c.select.addEventListener('mousedown', () => { (window as any).__hits += 100; });
    }, mode);
    await rAF2(page);

    const geom = await page.evaluate(() => {
      const c = (window as any).__case;
      const s = c.select.getBoundingClientRect();
      const o = c.overlay ? c.overlay.getBoundingClientRect() : null;
      const cs = c.overlay ? getComputedStyle(c.overlay) : null;
      return {
        select: { x: +s.x.toFixed(1), y: +s.y.toFixed(1), w: +s.width.toFixed(1), h: +s.height.toFixed(1) },
        overlayRect: o ? { x: +o.x.toFixed(1), y: +o.y.toFixed(1), w: +o.width.toFixed(1), h: +o.height.toFixed(1) } : null,
        overlayDisplay: cs?.display ?? null,
        pointerEvents: cs?.pointerEvents ?? null,
        ariaHidden: c.overlay?.getAttribute('aria-hidden') ?? null,
        // elementFromPoint retargets to the shadow host, so walk each root down.
        hitPath: o
          ? (() => {
              const px = o.x + o.width / 2, py = o.y + o.height / 2;
              const path: string[] = [];
              let root: any = document;
              while (root) {
                const el = root.elementFromPoint?.(px, py);
                if (!el) break;
                path.push(el.tagName.toLowerCase());
                root = el.shadowRoot ?? null;
              }
              return path.join(' > ');
            })()
          : null,
      };
    });

    let clickThrough: any = null;
    if (geom.overlayRect && geom.overlayDisplay !== 'none') {
      await page.mouse.click(geom.overlayRect.x + geom.overlayRect.w / 2, geom.overlayRect.y + geom.overlayRect.h / 2);
      await rAF2(page);
      clickThrough = await page.evaluate(() => {
        const c = (window as any).__case;
        return {
          hits: (window as any).__hits,
          open: (c.select as any).matches?.(':open') ?? null,
          focused: (c.select.getRootNode() as any).activeElement === c.select,
        };
      });
      await page.keyboard.press('Escape');
    }
    rows.push({ mode, ...geom, clickThrough });
  }

  // Does the native text collide with the overlay? Measure where each engine
  // starts drawing the option text, with and without the extra left padding the
  // overlay needs.
  const textStart = async (padLeftRem: number | null) => {
    await page.evaluate((pad) => {
      const c = (window as any).buildCase({
        depth: 2, recipe: 'none', rich: false, count: 244, overlay: 'plain', overlayIndex: 20,
        extraCss: pad == null ? '' : `select.form-select { padding-left: ${pad}rem; }`,
      });
      c.select.value = 'BE';
    }, padLeftRem);
    await rAF2(page);
    const geo = await page.evaluate(() => {
      const c = (window as any).__case;
      const s = c.select.getBoundingClientRect();
      const o = c.overlay.getBoundingClientRect();
      return {
        paddingLeft: getComputedStyle(c.select).paddingLeft,
        overlayWidth: +o.width.toFixed(1),
        overlayRightEdge: +(o.x + o.width - s.x).toFixed(1),
      };
    });
    const { img, scale } = await clipShot(page, await cssBox(page, 'select'));
    // With the overlay drawn, the first ink IS the overlay flag; measure to the
    // right of it to find where the native text begins.
    const x0 = Math.round((geo.overlayRightEdge + 1) * scale);
    const ink = firstDarkColumn(img, { x0, y0: 3, y1: img.height - 3 });
    return { ...geo, firstTextInkCss: ink < 0 ? -1 : +(ink / scale).toFixed(1) };
  };
  const textNoPad = await textStart(null);
  const textPadded = await textStart(4.25);
  const textPaddedWide = await textStart(6);

  // Focus ring visible while the overlay sits on top?
  await page.evaluate(() => {
    const c = (window as any).buildCase({ depth: 2, recipe: 'none', rich: false, count: 244, overlay: 'cover', overlayIndex: 20 });
    c.select.value = 'BE';
  });
  await page.locator('#probe').focus();
  await page.keyboard.press('Tab');
  // `.form-select` transitions box-shadow over 150ms; screenshotting after 2 rAFs
  // catches the ring at ~0 spread and reads as "no ring".
  await page.waitForTimeout(400);
  const focusState = await page.evaluate(() => {
    const c = (window as any).__case;
    return {
      selectFocused: (c.select.getRootNode() as any).activeElement === c.select,
      matchesFocusVisible: c.select.matches(':focus-visible'),
      boxShadow: getComputedStyle(c.select).boxShadow,
    };
  });
  const { img: focusShot, scale: focusScale } = await clipShot(page, await cssBox(page, 'root', 8));
  // Bootstrap's ring is rgba(13,110,253,.25) over white ~= rgb(194,216,254): a
  // 60-point channel spread, measured in the 8 CSS-px gutter left of the border.
  const ringPixels = hasSaturatedColour(focusShot, { x1: Math.round(8 * focusScale), minSat: 30 });
  log('S2.5', browserName, {
    rows, textNoPad, textPadded, textPaddedWide,
    focusState, ringPixels, focusScale,
  });

  const plain = rows.find((r) => r.mode === 'plain');
  expect.soft(plain.hitPath, 'hit test passes through the overlay to the select').toContain('select');
  expect.soft(plain.clickThrough.hits, 'click reached the select').toBeGreaterThan(0);
  expect.soft(plain.clickThrough.focused, 'click focused the select').toBe(true);
  const enhancedOff = rows.find((r) => r.mode === 'enhanced-off');
  expect.soft(enhancedOff.overlayDisplay, '@supports gate hides the overlay only where base-select works')
    .toBe(e.supportsBaseSelect ? 'none' : 'flex');
  expect.soft(ringPixels, 'focus ring visible').toBe(true);
  // 4.25rem is NOT enough in every engine: the overlay's own width depends on the
  // ISO-code glyph advance, which differs per engine's default UI font.
  expect.soft(textPaddedWide.paddingLeft, '6rem padding applied').toBe('96px');
  expect.soft(textPaddedWide.overlayWidth, 'overlay narrower than the 96px gutter').toBeLessThan(96);
});

// ---------------------------------------------------------------------------
// S2.9 — RTL. Follow-up to S1's finding that the UA forces input[type=tel] to
//        `direction: ltr` even inside dir="rtl", so a logical property on the
//        overlay and one on the tel input can disagree about which side is start.
// ---------------------------------------------------------------------------

/** Inked columns in CSS px: min/max tell which SIDE something is drawn on. */
function inkColumns(img: ReturnType<typeof decodePng>, scale: number, opts: { y0?: number; y1?: number; pick?: (r: number, g: number, b: number) => boolean } = {}) {
  const { y0 = 3, y1 = img.height - 3, pick } = opts;
  const cols: number[] = [];
  for (let x = 0; x < img.width; x++) {
    for (let y = y0; y < y1; y++) {
      const i = (y * img.width + x) * img.channels;
      const [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]];
      const hit = pick ? pick(r, g, b) : (255 - r > 8 || 255 - g > 8 || 255 - b > 8);
      if (hit) { cols.push(x); break; }
    }
  }
  if (cols.length === 0) return { min: -1, max: -1, count: 0 };
  return {
    min: +(cols[0] / scale).toFixed(1),
    max: +(cols[cols.length - 1] / scale).toFixed(1),
    count: +(cols.length / scale).toFixed(1),
  };
}

test('S2.9 RTL: direction inheritance, overlay side, reserved padding, picker-icon side', async ({ page, browserName }) => {
  await boot(page);
  const e = await env(page);
  const dirSupport = await page.evaluate(() => ({
    dirSelector: CSS.supports('selector(:dir(rtl))'),
    hostDirSelector: CSS.supports('selector(:host(:dir(rtl)))'),
  }));

  // ---- 1. computed `direction` of every element in the composed tree ----
  const directions = async (dir: 'ltr' | 'rtl', recipe: string, rich: boolean) => {
    await page.evaluate(({ d, rec, r }) => {
      const c = (window as any).buildCase({
        depth: 2, recipe: rec, rich: r, count: 244, locale: 'nl', labelOrder: 'name-first',
        tel: true, dir: d, overlay: 'plain', overlayIndex: 20,
        // The real shape per S2.4: the country picker gets a pinned basis, the tel
        // input takes the rest. `:host` from the inner tree beats x-group's
        // `::slotted(*)` normal declaration — S1's specificity finding, confirmed here.
        extraCss: ':host { width: 7.5rem; flex: 0 0 auto; }',
      });
      c.select.value = 'BE';
    }, { d: dir, rec: recipe, r: rich });
    await rAF2(page);
    return page.evaluate(() => {
      const c = (window as any).__case;
      const dirOf = (el: Element | null) => (el ? getComputedStyle(el).direction : null);
      const box = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: +r.x.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1) };
      };
      return {
        hostAncestorDir: document.getElementById('host')!.getAttribute('dir'),
        direction: {
          phoneHost: dirOf(c.phone),
          group: dirOf(c.phone.shadowRoot.querySelector('x-group')),
          selectHost: dirOf(c.xsel),
          innerSelect: dirOf(c.select),
          telInput: dirOf(c.tel),
          overlay: dirOf(c.overlay),
        },
        // geometry, relative to the phone host, so "which side" is unambiguous
        hostX: +c.phone.getBoundingClientRect().x.toFixed(1),
        hostW: +c.phone.getBoundingClientRect().width.toFixed(1),
        geom: { select: box(c.select), tel: box(c.tel), overlay: box(c.overlay) },
        // Which control is visually first, and do they overlap?
        rowOrder: (() => {
          const s = c.select.getBoundingClientRect(), t = c.tel.getBoundingClientRect();
          return {
            first: s.x < t.x ? 'select' : 'tel',
            overlapPx: +Math.max(0, Math.min(s.right, t.right) - Math.max(s.x, t.x)).toFixed(1),
          };
        })(),
        selectPadding: (() => {
          const cs = getComputedStyle(c.select);
          return { left: cs.paddingLeft, right: cs.paddingRight, inlineStart: cs.paddingInlineStart, inlineEnd: cs.paddingInlineEnd };
        })(),
        selectTextAlign: getComputedStyle(c.select).textAlign,
        bgPosition: getComputedStyle(c.select).backgroundPosition,
        // Bootstrap's reboot sets `* { box-sizing: border-box }` on the DOCUMENT, and
        // a `*` selector in a page stylesheet cannot match inside a shadow root — so
        // the inner <select> may be content-box, which makes `width` + reserved
        // padding compose wrongly. Measured, not assumed.
        boxSizing: {
          innerSelect: getComputedStyle(c.select).boxSizing,
          selectHost: getComputedStyle(c.xsel).boxSizing,
          telInput: getComputedStyle(c.tel).boxSizing,
        },
      };
    });
  };

  const fallbackLtr = await directions('ltr', 'none', false);
  const fallbackRtl = await directions('rtl', 'none', false);
  const enhancedRtl = e.supportsBaseSelect ? await directions('rtl', 'pairGated', true) : null;

  // ---- 2. reserved padding under RTL: does the text clear the overlay? ----
  const reserved = async (mode: 'logical' | 'physical' | 'physical-guarded' | 'logical-content-box') => {
    await page.evaluate((m) => {
      const borderBox = 'select.form-select { box-sizing: border-box; }';
      const css = {
        // What the S2 report recommended: logical padding, logical overlay inset.
        logical: borderBox + 'select.form-select { padding-inline-start: 6rem; }',
        // Naive physical: correct in LTR, wrong side in RTL.
        physical: borderBox + 'select.form-select { padding-left: 6rem; }',
        // S1's conclusion applied here: physical, guarded by direction.
        'physical-guarded': borderBox +
          'select.form-select { padding-left: 6rem; }' +
          ':host(:dir(rtl)) select.form-select { padding-left: .75rem; padding-right: 6rem; }',
        // Same as `logical`, but WITHOUT restoring border-box — i.e. what the real
        // mp-select does today, since reboot's `*` rule can't reach the shadow root.
        'logical-content-box': 'select.form-select { padding-inline-start: 6rem; }',
      }[m];
      const c = (window as any).buildCase({
        depth: 2, recipe: 'none', rich: false, count: 244, locale: 'nl', labelOrder: 'name-first',
        tel: true, dir: 'rtl', overlay: 'plain', overlayIndex: 20,
        extraCss: ':host { width: 7.5rem; flex: 0 0 auto; }' + css,
      });
      c.select.value = 'BE';
    }, mode);
    await rAF2(page);
    const geo = await page.evaluate(() => {
      const c = (window as any).__case;
      const s = c.select.getBoundingClientRect(), o = c.overlay.getBoundingClientRect();
      const t = c.tel.getBoundingClientRect();
      const cs = getComputedStyle(c.select);
      return {
        padding: { left: cs.paddingLeft, right: cs.paddingRight },
        boxSizing: cs.boxSizing,
        selectW: +s.width.toFixed(1),
        // overlay position expressed as an offset from BOTH edges of the select
        overlayFromSelectLeft: +(o.x - s.x).toFixed(1),
        overlayFromSelectRight: +(s.right - o.right).toFixed(1),
        overlayW: +o.width.toFixed(1),
        selectTelOverlapPx: +Math.max(0, Math.min(s.right, t.right) - Math.max(s.x, t.x)).toFixed(1),
      };
    });
    const { img, scale } = await clipShot(page, await cssBox(page, 'select'));
    return { mode, ...geo, ink: inkColumns(img, scale) };
  };
  const reservedLogical = await reserved('logical');
  const reservedPhysical = await reserved('physical');
  const reservedGuarded = await reserved('physical-guarded');
  const reservedContentBox = await reserved('logical-content-box');

  // ---- 3. ::picker-icon side in RTL (pseudo-element: pixel-measured) ----
  let pickerIcon: any = { skipped: 'no base-select' };
  if (e.supportsBaseSelect) {
    const iconProbe = async (dir: 'ltr' | 'rtl') => {
      await page.evaluate((d) => {
        const c = (window as any).buildCase({
          depth: 2, recipe: 'pairGated', rich: true, count: 244, locale: 'nl',
          tel: true, dir: d,
          // A pseudo-element has no DOM node, so paint it MAGENTA — no flag in the
          // palette uses it. (#ff0000 was a false positive: the synthetic flags
          // contain #F31830, which any "red-dominant" test also matches.)
          extraCss: ':host { width: 7.5rem; flex: 0 0 auto; box-sizing: border-box; }'
            + '@supports (appearance: base-select) { select.form-select::picker-icon { color: #ff00ff; } }',
        });
        c.select.value = 'BE';
      }, dir);
      await rAF2(page);
      const { img, scale } = await clipShot(page, await cssBox(page, 'select'));
      const icon = inkColumns(img, scale, { pick: (r, g, b) => r > 200 && g < 80 && b > 200 });
      const selW = await page.evaluate(() => +(window as any).__case.select.getBoundingClientRect().width.toFixed(1));
      return { dir, selectW: selW, icon, side: icon.min < 0 ? 'not-found' : icon.min < selW / 2 ? 'leading-in-ltr(left)' : 'trailing-in-ltr(right)' };
    };
    pickerIcon = { ltr: await iconProbe('ltr'), rtl: await iconProbe('rtl') };
  }

  log('S2.9', browserName, {
    supportsBaseSelect: e.supportsBaseSelect, dirSupport,
    fallbackLtr, fallbackRtl, enhancedRtl,
    reserved: [reservedLogical, reservedPhysical, reservedGuarded, reservedContentBox],
    pickerIcon,
  });

  // The premise from S1, re-measured here.
  expect.soft(fallbackRtl.direction.selectHost, 'mp-select host inherits rtl across two boundaries').toBe('rtl');
  expect.soft(fallbackRtl.direction.innerSelect, 'the inner <select> inherits rtl').toBe('rtl');
  expect.soft(fallbackRtl.direction.telInput, 'the UA forces input[type=tel] to ltr').toBe('ltr');
  // The overlay follows the host, i.e. the same side as the select's own text.
  expect.soft(fallbackRtl.geom.overlay!.x > fallbackRtl.geom.select!.x, 'rtl overlay sits on the right').toBe(true);
  expect.soft(fallbackLtr.geom.overlay!.x - fallbackLtr.geom.select!.x, 'ltr overlay sits on the left').toBeLessThan(4);
  // Reserved padding: logical and direction-guarded physical must agree; naive
  // physical must NOT reserve on the side the overlay occupies.
  expect.soft(reservedLogical.padding.right, 'padding-inline-start resolves to the right in rtl').toBe('96px');
  expect.soft(reservedPhysical.padding.right, 'naive padding-left reserves the WRONG side in rtl').not.toBe('96px');
  expect.soft(reservedGuarded.padding.right, ':dir(rtl)-guarded physical reserves the right side').toBe('96px');
  // Reboot's `* { box-sizing: border-box }` cannot reach into a shadow root — but it
  // does not need to: the UA stylesheet already makes form controls border-box, so
  // adding it changes nothing (`logical` and `logical-content-box` are identical).
  expect.soft(fallbackLtr.boxSizing.innerSelect, 'UA gives <select> border-box inside the shadow root').toBe('border-box');
  expect.soft(reservedContentBox.selectW, 'declaring box-sizing is a no-op here').toBe(reservedLogical.selectW);
  expect.soft(reservedLogical.selectW, 'the pinned width holds with logical padding').toBe(120);
  // Reserving on the WRONG side does not merely look wrong: padding-left 96 +
  // Bootstrap's padding-right 36 exceeds the 120px basis, so the border-box floor
  // inflates the control and it overflows into the tel input.
  expect.soft(reservedPhysical.selectW, 'wrong-side padding inflates the control').toBeGreaterThan(120);
  expect.soft(reservedPhysical.selectTelOverlapPx, 'wrong-side padding overlaps the tel input').toBeGreaterThan(0);
  expect.soft(reservedLogical.selectTelOverlapPx, 'logical padding keeps the row intact').toBe(0);
  if (e.supportsBaseSelect) {
    expect.soft(pickerIcon.ltr.side, 'ltr: picker-icon at the trailing (right) edge').toBe('trailing-in-ltr(right)');
    expect.soft(pickerIcon.rtl.side, 'rtl: margin-inline-start:auto moves it to the left').toBe('leading-in-ltr(left)');
  }
});

// ---------------------------------------------------------------------------
// S2.6 — accessible names from Chromium's real accessibility tree (CDP)
// ---------------------------------------------------------------------------

test('S2.6 accessible name of the select / selected option (CDP accname)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'real accname requires Chromium CDP');
  await boot(page);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');

  /**
   * Resolves the <select> by walking a pierced DOM tree, so the AX subtree we read
   * is definitely the control's and not the page's own #go button.
   */
  const selectNodeId = async () => {
    const { root } = (await cdp.send('DOM.getDocument', { depth: -1, pierce: true } as any)) as any;
    const stack = [root];
    while (stack.length) {
      const n = stack.pop();
      if (n.nodeName === 'SELECT') return n.nodeId as number;
      for (const kid of [...(n.children ?? []), ...(n.shadowRoots ?? []), ...(n.contentDocument ? [n.contentDocument] : [])]) stack.push(kid);
    }
    throw new Error('no <select> in the pierced DOM tree');
  };

  const snap = async (label: string) => {
    const nodeId = await selectNodeId();
    const { nodes } = (await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: true } as any)) as any;
    const shape = (n: any) => ({
      role: n.role?.value,
      name: n.name?.value,
      nameFrom: n.name?.sources?.find((s: any) => s.value?.value === n.name?.value && !s.superseded)?.type ?? null,
      value: n.value?.value,
    });
    const full = (await cdp.send('Accessibility.getFullAXTree', { depth: -1 } as any)) as any;
    const isOption = (n: any) => ['option', 'menuListOption', 'MenuListOption'].includes(n.role?.value);
    return {
      label,
      // the control itself, whatever role Chromium gives it under base-select
      control: nodes.filter((n: any) => ['combobox', 'menuButton', 'button', 'listbox', 'popUpButton'].includes(n.role?.value)).map(shape).slice(0, 3),
      partialRoles: [...new Set(nodes.map((n: any) => n.role?.value))].slice(0, 12),
      optionCount: full.nodes.filter(isOption).length,
      options: full.nodes.filter(isOption).map(shape).slice(0, 3),
    };
  };

  const cases: any[] = [];
  for (const [recipe, rich] of [['pairGated', true], ['none', false]] as const) {
    await page.evaluate(({ rec, r }) => {
      const c = (window as any).buildCase({ depth: 2, recipe: rec, rich: r, count: 8, locale: 'en' });
      c.select.value = 'AF';
    }, { rec: recipe, r: rich });
    await rAF2(page);
    cases.push(await snap(`${recipe} closed`));
    await openPicker(page);
    cases.push(await snap(`${recipe} open`));
    await page.keyboard.press('Escape');
  }
  log('S2.6', browserName, cases);

  const richOpen = cases.find((c) => c.label === 'pairGated open');
  expect.soft(richOpen.options[0]?.name, 'rich option still exposes a text accname').toBeTruthy();
  const richClosed = cases.find((c) => c.label === 'pairGated closed');
  expect.soft(richClosed.control[0]?.name, 'the control keeps its aria-label').toBe('Land');
});

// ---------------------------------------------------------------------------
// S2.7 — perf of 244 SVG-bearing options
// ---------------------------------------------------------------------------

test('S2.7 perf: 244 options, inline SVG vs text', async ({ page, browserName }) => {
  await boot(page);
  const e = await env(page);

  const bytes = await page.evaluate(() => ({
    flagBytesTotal: (window as any).harness.flagBytes(244),
    countries: (window as any).harness.countries('nl').length,
    perFlagMin: Math.min(...Array.from({ length: 244 }, (_, i) => (window as any).harness.flagSvg(i).length)),
    perFlagMax: Math.max(...Array.from({ length: 244 }, (_, i) => (window as any).harness.flagSvg(i).length)),
  }));

  // Build cost is measurable in EVERY engine: constructing 244 SVG-bearing options
  // costs the same whether or not the engine will ever paint them.
  const build = async (rich: boolean, recipe: string) => {
    const runs: any[] = [];
    for (let i = 0; i < 5; i++) {
      runs.push(await page.evaluate(({ r, rec }) => (window as any).measureBuild({ depth: 2, recipe: rec, rich: r, count: 244 }), { r: rich, rec: recipe }));
    }
    const med = (k: string) => runs.map((x) => x[k]).sort((a, b) => a - b)[2];
    return { medianBuild: med('build'), medianLayout: med('layout'), medianTotal: med('total'), runs };
  };

  const open = async (rich: boolean, recipe: string) => {
    await page.evaluate(({ r, rec }) => {
      (window as any).buildCase({ depth: 2, recipe: rec, rich: r, count: 244 });
      (window as any).armFrames();
    }, { r: rich, rec: recipe });
    await openPicker(page);
    await page.waitForFunction(() => (window as any).__frames !== null, null, { timeout: 10_000 }).catch(() => {});
    const res = await page.evaluate(() => (window as any).__frames);
    await page.keyboard.press('Escape');
    return res;
  };

  const richBuild = await build(true, e.supportsBaseSelect ? 'pairGated' : 'none');
  const textBuild = await build(false, 'none');
  const richOpen = e.supportsBaseSelect ? await open(true, 'pairGated') : { skipped: 'native popup not measurable' };
  const textOpen = e.supportsBaseSelect ? await open(false, 'pairGated') : { skipped: 'native popup not measurable' };

  log('S2.7', browserName, { bytes, richBuild, textBuild, richOpen, textOpen });

  expect.soft(richBuild.medianTotal, 'building 244 flag options < 100ms').toBeLessThan(100);
  if (e.supportsBaseSelect) {
    expect.soft((richOpen as any).maxGapAfterDown, 'opening the 244-flag picker < 100ms frame').toBeLessThan(100);
  }
});

// ---------------------------------------------------------------------------
// S2.8 — minimal CSS recipe + Bootstrap .form-select conflicts
// ---------------------------------------------------------------------------

test('S2.8 recipe matrix + Bootstrap .form-select conflict', async ({ page, browserName }) => {
  await boot(page);
  const e = await env(page);

  const rows: any[] = [];
  for (const recipe of ['none', 'pair', 'selectOnly', 'pairSpecific', 'pairFixed', 'pairGated'] as const) {
    await page.evaluate((rec) => {
      const c = (window as any).buildCase({ depth: 2, recipe: rec, rich: true, count: 12 });
      c.select.value = 'AL';
    }, recipe);
    await rAF2(page);

    const closed = await page.evaluate(() => {
      const c = (window as any).__case;
      const cs = getComputedStyle(c.select);
      const svg = c.select.querySelector('selectedcontent svg');
      return {
        appearance: cs.appearance,
        bgImage: cs.backgroundImage === 'none' ? 'none' : 'bootstrap-caret',
        paddingRight: cs.paddingRight,
        height: +c.select.getBoundingClientRect().height.toFixed(2),
        selectedContentSvgW: svg ? +svg.getBoundingClientRect().width.toFixed(2) : 0,
      };
    });

    let opened: any = { skipped: 'no base-select' };
    if (e.supportsBaseSelect) {
      await openPicker(page);
      opened = await page.evaluate(() => {
        const c = (window as any).__case;
        const opts = [...c.select.querySelectorAll('option')];
        return {
          isOpen: c.select.matches(':open'),
          optionsLaidOut: opts.filter((o: Element) => o.getBoundingClientRect().height > 0).length,
          optionSvgW: +(opts[1].querySelector('svg')?.getBoundingClientRect().width ?? 0).toFixed(2),
        };
      });
      await page.keyboard.press('Escape');
    }

    // Two carets? Count contiguous inked column runs in the right 44 CSS px of the
    // closed face: one run is the border, a caret is another, two carets are three.
    const { img, scale } = await clipShot(page, await cssBox(page, 'select'));
    const x0 = Math.max(0, img.width - Math.round(44 * scale));
    const inked: number[] = [];
    for (let x = x0; x < img.width; x++) {
      for (let y = Math.round(4 * scale); y < img.height - Math.round(4 * scale); y++) {
        const i = (y * img.width + x) * img.channels;
        if (255 - img.data[i] > 8 || 255 - img.data[i + 1] > 8 || 255 - img.data[i + 2] > 8) { inked.push(x - x0); break; }
      }
    }
    const runs = inked.reduce<number[][]>((acc, x) => {
      const last = acc[acc.length - 1];
      if (last && x === last[last.length - 1] + 1) last.push(x); else acc.push([x]);
      return acc;
    }, []);
    rows.push({
      recipe, ...closed, opened,
      rightGutterInkRuns: runs.length,
      rightGutterInkColsCss: +(inked.length / scale).toFixed(1),
    });
  }
  log('S2.8', browserName, { supportsBaseSelect: e.supportsBaseSelect, rows });

  const by = Object.fromEntries(rows.map((r) => [r.recipe, r]));
  if (e.supportsBaseSelect) {
    expect.soft(by.pair.appearance, 'bare `select` loses to Bootstrap .form-select').toBe('none');
    expect.soft(by.selectOnly.appearance, 'class specificity wins').toBe('base-select');
    expect.soft(by.selectOnly.opened.optionsLaidOut, 'without ::picker(select) the picker stays native').toBe(0);
    expect.soft(by.pairSpecific.opened.optionsLaidOut, 'with ::picker(select) options are laid out').toBe(12);
    expect.soft(by.pairGated.opened.optionSvgW, 'gated recipe still renders option svg').toBeGreaterThan(0);
  } else {
    expect.soft(by.pairGated.bgImage, 'gated recipe leaves the fallback caret alone').toBe('bootstrap-caret');
    expect.soft(by.pairFixed.bgImage, 'ungated recipe destroys the fallback caret').toBe('none');
  }
});
