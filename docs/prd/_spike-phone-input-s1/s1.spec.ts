import { expect, test } from '@playwright/test';

/**
 * Spike S1 (GATE) — can `mp-input-group` style BOTH light-DOM children and
 * shadow-DOM `mp-*` children, given that Bootstrap's own
 * `.input-group > .form-select` rules can never cross a shadow boundary?
 *
 * Two channels under test (PRD §5.2):
 *   1. `::slotted()` positional rules for light-DOM children.
 *   2. inherited `--mp-group-radius-start/-end` custom properties, consumed by
 *      the control inside its own shadow root, for `mp-*` children.
 *
 * Throwaway; verdicts recorded in docs/prd/phone-input-wc.md §9.
 */

const RADIUS = 6; // --bs-border-radius: 0.375rem at a 16px root font size

type Radii = { tl: number; tr: number; br: number; bl: number };
type Rect = { left: number; right: number; top: number; bottom: number; width: number; height: number };
type Item = {
  tag: string;
  rect: Rect;
  radii: Radii;
  marginInlineStart: string;
  flexGrow: string;
  position: string;
  zIndex: string;
  borderTopColor: string;
  paddingLeft: string;
  direction: string;
  marginLeft: string;
  marginRight: string;
  outlineStyle: string;
  outlineColor: string;
  props: { start: string; end: string; fontSize: string };
  inner: { radii: Radii; rect: Rect; fontSize: string } | null;
};

const near = (a: number, b: number, tol = 0.75) => Math.abs(a - b) <= tol;

/** Assert a control's start side is squared and its end side keeps the radius. */
function expectStartSquared(radii: Radii, label: string) {
  expect(near(radii.tl, 0), `${label} top-left squared (got ${radii.tl})`).toBe(true);
  expect(near(radii.bl, 0), `${label} bottom-left squared (got ${radii.bl})`).toBe(true);
  expect(near(radii.tr, RADIUS), `${label} top-right keeps radius (got ${radii.tr})`).toBe(true);
  expect(near(radii.br, RADIUS), `${label} bottom-right keeps radius (got ${radii.br})`).toBe(true);
}

function expectEndSquared(radii: Radii, label: string) {
  expect(near(radii.tl, RADIUS), `${label} top-left keeps radius (got ${radii.tl})`).toBe(true);
  expect(near(radii.bl, RADIUS), `${label} bottom-left keeps radius (got ${radii.bl})`).toBe(true);
  expect(near(radii.tr, 0), `${label} top-right squared (got ${radii.tr})`).toBe(true);
  expect(near(radii.br, 0), `${label} bottom-right squared (got ${radii.br})`).toBe(true);
}

function expectAllSquared(radii: Radii, label: string) {
  (['tl', 'tr', 'br', 'bl'] as const).forEach((k) =>
    expect(near(radii[k], 0), `${label} ${k} squared (got ${radii[k]})`).toBe(true),
  );
}

function expectJoined(items: Item[], label: string) {
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1].rect;
    const cur = items[i].rect;
    expect(
      near(cur.left, prev.right - 1, 1),
      `${label}: item ${i} overlaps the previous border by 1px (prev.right=${prev.right}, cur.left=${cur.left})`,
    ).toBe(true);
    expect(
      near(cur.height, prev.height, 1),
      `${label}: item ${i} is the same height as the previous (${prev.height} vs ${cur.height})`,
    ).toBe(true);
    expect(near(cur.top, prev.top, 1), `${label}: item ${i} is on the same row`).toBe(true);
  }
}

async function open(page: import('@playwright/test').Page) {
  await page.goto('/s1.html');
  await page.waitForFunction(
    () => {
      const deep = (host: Element | null | undefined, sel: string) => host?.shadowRoot?.querySelector(sel) ?? null;
      const c4 = deep(document.querySelector('#c4 spike-select'), '.form-select');
      const innerGroup = deep(document.querySelector('#c5'), '#inner');
      const c5 = deep(innerGroup?.querySelector('spike-select'), '.form-select');
      return !!(c4 && (c4 as HTMLElement).getBoundingClientRect().width > 0 && c5);
    },
    null,
    { timeout: 20_000 },
  );
}

async function measure(page: import('@playwright/test').Page, id: string): Promise<Item[]> {
  return page.evaluate((groupId) => {
    const px = (v: string) => parseFloat(v) || 0;
    const radiiOf = (cs: CSSStyleDeclaration) => ({
      tl: px(cs.borderTopLeftRadius),
      tr: px(cs.borderTopRightRadius),
      br: px(cs.borderBottomRightRadius),
      bl: px(cs.borderBottomLeftRadius),
    });
    const rectOf = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };

    const host = document.getElementById(groupId)!;
    const group = host.tagName.toLowerCase() === 'spike-phone' ? host.shadowRoot!.querySelector('#inner')! : host;

    return [...group.children].map((el) => {
      const cs = getComputedStyle(el);
      const innerEl = el.shadowRoot?.querySelector('.form-select') ?? null;
      return {
        tag: el.tagName.toLowerCase(),
        rect: rectOf(el),
        radii: radiiOf(cs),
        marginInlineStart: cs.marginInlineStart,
        flexGrow: cs.flexGrow,
        position: cs.position,
        zIndex: cs.zIndex,
        borderTopColor: cs.borderTopColor,
        paddingLeft: cs.paddingLeft,
        direction: cs.direction,
        marginLeft: cs.marginLeft,
        marginRight: cs.marginRight,
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        props: {
          start: cs.getPropertyValue('--mp-group-radius-start').trim(),
          end: cs.getPropertyValue('--mp-group-radius-end').trim(),
          fontSize: cs.getPropertyValue('--mp-group-font-size').trim(),
        },
        inner: innerEl
          ? { radii: radiiOf(getComputedStyle(innerEl)), rect: rectOf(innerEl), fontSize: getComputedStyle(innerEl).fontSize }
          : null,
      };
    });
  }, id);
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('S1.0 REFUTED: a normal ::slotted() declaration cannot square a light-DOM child the page already styled', async ({ page }, info) => {
  const items = await measure(page, 'c1b');
  console.log(`[${info.project.name}] c1b (no !important)`, JSON.stringify(items.map((i) => ({ tag: i.tag, radii: i.radii, ml: i.marginLeft }))));

  // The positional selector DOES match — the margin proves it...
  expect(items[1].marginLeft, '::slotted(:not(:first-child)) matches').toBe('-1px');
  // ...but the radius declaration loses to the page's `.form-control` rule,
  // because normal declarations from the tree the child lives in beat
  // ::slotted() declarations from the shadow tree that slots it.
  expect(items[0].radii.tr, 'page radius survives on the first child').toBeCloseTo(RADIUS, 0);
  expect(items[1].radii.tl, 'page radius survives on the middle child').toBeCloseTo(RADIUS, 0);
});

test('S1.1 light-DOM children: positional ::slotted() corner pairing + flex + overlap', async ({ page }, info) => {
  const items = await measure(page, 'c1');
  console.log(`[${info.project.name}] c1`, JSON.stringify(items.map((i) => ({ tag: i.tag, radii: i.radii, mis: i.marginInlineStart, grow: i.flexGrow }))));

  expect(items.map((i) => i.tag)).toEqual(['input', 'span', 'button']);
  expectEndSquared(items[0].radii, 'c1 input (first)');
  expectAllSquared(items[1].radii, 'c1 addon (middle)');
  expectStartSquared(items[2].radii, 'c1 button (last)');

  expect(items[0].marginLeft).toBe('0px');
  expect(items[1].marginLeft).toBe('-1px');
  expect(items[2].marginLeft).toBe('-1px');

  expect(items[0].flexGrow, 'the input grows').toBe('1');
  expect(items[1].flexGrow, 'the addon does not grow').toBe('0');

  expectJoined(items, 'c1');
});

test('S1.2 shadow-DOM child (select LAST): --mp-group-* inherits and squares only the start side', async ({ page }, info) => {
  const items = await measure(page, 'c2');
  console.log(`[${info.project.name}] c2`, JSON.stringify(items.map((i) => ({ tag: i.tag, radii: i.radii, props: i.props, inner: i.inner?.radii }))));

  const [input, select] = items;
  expect(select.tag).toBe('spike-select');

  // The contract property must arrive on the host...
  expect(select.props.start, 'host resolves --mp-group-radius-start').toBe('0');
  expect(select.props.end, '--mp-group-radius-end is unset on the last child').toBe('');

  // ...and be consumed by the real Bootstrap .form-select INSIDE the shadow root.
  expect(select.inner, 'the shadow .form-select is reachable').not.toBeNull();
  expectStartSquared(select.inner!.radii, 'c2 mp-select inner .form-select');

  expectEndSquared(input.radii, 'c2 input (first)');
  expect(select.flexGrow, 'the slotted mp-select grows').toBe('1');

  // The host box and the control it wraps must coincide, or the visible border
  // is not the one we measured for adjacency.
  expect(near(select.rect.height, select.inner!.rect.height, 1)).toBe(true);
  expect(near(select.rect.width, select.inner!.rect.width, 1)).toBe(true);

  expectJoined(items, 'c2');
});

test('S1.3 shadow-DOM child (select FIRST): end side squared instead', async ({ page }, info) => {
  const items = await measure(page, 'c3');
  console.log(`[${info.project.name}] c3`, JSON.stringify(items.map((i) => ({ tag: i.tag, props: i.props, inner: i.inner?.radii, radii: i.radii }))));

  const [select, input] = items;
  expect(select.props.start, '--mp-group-radius-start unset on the first child').toBe('');
  expect(select.props.end, 'host resolves --mp-group-radius-end').toBe('0');
  expectEndSquared(select.inner!.radii, 'c3 mp-select inner .form-select');
  expectStartSquared(input.radii, 'c3 input (last)');
  expectJoined(items, 'c3');
});

test('S1.4 the real shape: mp-select + dial code + tel input joins seamlessly', async ({ page }, info) => {
  const items = await measure(page, 'c4');
  console.log(`[${info.project.name}] c4`, JSON.stringify(items.map((i) => ({ tag: i.tag, radii: i.radii, inner: i.inner?.radii, rect: i.rect }))));

  expect(items.map((i) => i.tag)).toEqual(['spike-select', 'span', 'input']);
  expectEndSquared(items[0].inner!.radii, 'c4 mp-select (first)');
  expectAllSquared(items[1].radii, 'c4 dial code (middle)');
  expectStartSquared(items[2].radii, 'c4 tel input (last)');
  expectJoined(items, 'c4');
});

test('S1.5 the contract survives one shadow level deeper (phone → group → select)', async ({ page }, info) => {
  const items = await measure(page, 'c5');
  console.log(`[${info.project.name}] c5`, JSON.stringify(items.map((i) => ({ tag: i.tag, radii: i.radii, inner: i.inner?.radii }))));

  expect(items.map((i) => i.tag)).toEqual(['spike-select', 'span', 'input']);
  expectEndSquared(items[0].inner!.radii, 'c5 nested mp-select (first)');
  expectAllSquared(items[1].radii, 'c5 nested dial code (middle)');
  expectStartSquared(items[2].radii, 'c5 nested tel input (last)');
  expectJoined(items, 'c5');
});

test('S1.6 RTL: logical properties flip the squared side, physically', async ({ page }, info) => {
  const items = await measure(page, 'c6');
  console.log(`[${info.project.name}] c6`, JSON.stringify(items.map((i) => ({ tag: i.tag, radii: i.radii, inner: i.inner?.radii, rect: i.rect }))));

  const [select, addon, input] = items;
  // In RTL the inline start is the RIGHT edge, so the FIRST child sits rightmost
  // and squares the corners facing its neighbour — its LEFT ones.
  expect(near(select.inner!.radii.tl, 0), `rtl select top-left squared (got ${select.inner!.radii.tl})`).toBe(true);
  expect(near(select.inner!.radii.bl, 0), `rtl select bottom-left squared (got ${select.inner!.radii.bl})`).toBe(true);
  expect(near(select.inner!.radii.tr, RADIUS), `rtl select keeps top-right (got ${select.inner!.radii.tr})`).toBe(true);
  expect(near(select.inner!.radii.br, RADIUS), `rtl select keeps bottom-right (got ${select.inner!.radii.br})`).toBe(true);

  // ...and the LAST child sits leftmost, keeping its left corners.
  expect(near(input.radii.tl, RADIUS), `rtl input keeps top-left (got ${input.radii.tl})`).toBe(true);
  expect(near(input.radii.bl, RADIUS), `rtl input keeps bottom-left (got ${input.radii.bl})`).toBe(true);
  expect(near(input.radii.tr, 0), `rtl input top-right squared (got ${input.radii.tr})`).toBe(true);

  expectAllSquared(addon.radii, 'c6 dial code (middle)');

  // The reason physical properties are required: the UA forces a tel input to
  // ltr even here, so any logical property on it would resolve the wrong way.
  expect(input.direction, 'input[type=tel] is forced ltr inside an rtl context').toBe('ltr');
  expect(select.direction, 'a select inherits rtl normally').toBe('rtl');

  // Visual order reverses: the first child sits on the right, and each
  // subsequent item overlaps its predecessor's LEFT edge.
  expect(select.rect.left, 'rtl: first child is rightmost').toBeGreaterThan(input.rect.left);
  expect(input.marginRight, 'rtl overlap is applied on the right').toBe('-1px');
  expect(near(addon.rect.right, select.rect.left + 1, 1), 'rtl: addon meets the select').toBe(true);
  expect(near(input.rect.right, addon.rect.left + 1, 1), 'rtl: tel input meets the addon').toBe(true);
  expect(near(input.rect.height, select.rect.height, 1), 'rtl: equal heights, one row').toBe(true);
});

test('S1.7 page CSS still styles a slotted light-DOM control, but child combinators do not reach it', async ({ page }, info) => {
  const items = await measure(page, 'c4');
  const input = items[2];
  console.log(`[${info.project.name}] c4 input page-styles`, JSON.stringify({ border: input.borderTopColor, pad: input.paddingLeft, outline: [input.outlineStyle, input.outlineColor] }));

  // T7a — the page's `.form-control` reaches the slotted input (it stays in the
  // light DOM), so we must NOT re-declare typography/borders in the group.
  expect(input.borderTopColor, 'page .form-control border reaches the slotted input').toBe('rgb(222, 226, 230)');
  expect(input.paddingLeft, 'page .form-control padding reaches the slotted input').toBe('12px');

  // T7b — but `.input-group > .form-control` never matches, even though the
  // shadow container really does carry class="input-group". This is exactly why
  // the positional half of Bootstrap's contract has to be re-declared.
  expect(input.outlineStyle, 'a page child-combinator rule must not reach a slotted element').not.toBe('solid');
  expect(input.outlineColor).not.toBe('rgb(255, 0, 255)');
});

test('S1.8 a :host declaration of the contract prop does NOT defeat the group', async ({ page }, info) => {
  const items = await measure(page, 'c7');
  const select = items[1];
  console.log(`[${info.project.name}] c7 (:host declares the prop)`, JSON.stringify({ props: select.props, inner: select.inner?.radii }));

  expect(select.tag).toBe('spike-select-hostdecl');
  // Measured, and the opposite of what the shadow-migration note implies for
  // this direction: the group's ::slotted() rule sets the property ON the host
  // element from the outer tree, and an outer-tree declaration beats the inner
  // tree's :host rule. So the contract is robust even against a control that
  // (wrongly) declares the property itself.
  expectStartSquared(select.inner!.radii, 'c7 mp-select with a :host declaration');
});

test('S1.9 focus lift: the focused control rises above its overlapping sibling', async ({ page }, info) => {
  // Light-DOM child.
  await page.locator('#c1 input').focus();
  const light = await measure(page, 'c1');
  console.log(`[${info.project.name}] c1 focus`, JSON.stringify({ zIndex: light[0].zIndex, position: light[0].position }));
  expect(light[0].position, 'group items are positioned so z-index applies').toBe('relative');
  expect(light[0].zIndex, '::slotted(:focus) lifts a light-DOM child').toBe('5');

  // Shadow-DOM child: focus lives INSIDE the slotted host's shadow root, so the
  // lift depends on :focus-within (or delegatesFocus' :focus) matching the host.
  await page.evaluate(() => {
    const sel = document.querySelector('#c4 spike-select')!.shadowRoot!.querySelector('select') as HTMLSelectElement;
    sel.focus();
  });
  const deep = await measure(page, 'c4');
  console.log(`[${info.project.name}] c4 focus`, JSON.stringify({ hostZ: deep[0].zIndex, activeIsHost: true }));
  expect(deep[0].zIndex, '::slotted(:focus-within) lifts a shadow-DOM child').toBe('5');
});

test('S1.11 the group outranks even a consumer !important — authoritative, and not opt-out-able', async ({ page }, info) => {
  const items = await measure(page, 'c9');
  const addon = items[1];
  console.log(`[${info.project.name}] c9 (page !important)`, JSON.stringify({ radii: addon.radii }));

  // Important declarations invert the tree-order rule, so the INNER tree wins
  // twice over. Consequence for the API: a consumer cannot keep a rounded
  // middle child, and must reorder or leave the group instead.
  expectAllSquared(addon.radii, 'c9 addon with a page !important radius');
});

test('S1.10 sizing: a group can size a shadow child, but only via an explicit value', async ({ page }, info) => {
  const items = await measure(page, 'c8');
  const select = items[0];
  console.log(`[${info.project.name}] c8`, JSON.stringify({ prop: select.props.fontSize, innerFont: select.inner?.fontSize }));

  expect(select.props.fontSize, 'group[size=sm] sets the font-size contract prop').toBe('0.875rem');
  expect(select.inner!.fontSize, 'the shadow .form-select adopts it').toBe('14px');
});
