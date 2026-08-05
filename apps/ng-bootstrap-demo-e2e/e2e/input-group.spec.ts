import { test, expect, type Page } from '@playwright/test';

/**
 * PRD phone-input-wc §14 — the structural guard that was missing.
 *
 * `mp-input-group` used to size its children with `::slotted(mp-select),
 * ::slotted(mp-phone-input)`, naming the web components by tag. That matched
 * nothing for an Angular consumer, because `bs-input-group` slots `<ng-content>`
 * and the assigned node is therefore the WRAPPER HOST (`bs-select`,
 * `bs-phone-input`) with the `mp-*` element one level deeper. React and Vue root
 * at the `mp-*` tag, so two of three frameworks looked fine and the phone input
 * shipped collapsed to 0px wide.
 *
 * Nothing caught it because the two conditions needed to see it never co-occurred:
 * every test that could observe geometry slotted raw `mp-*` elements, and every
 * test that slotted a framework wrapper was jsdom asserting attributes. So these
 * assertions are deliberately about REAL GEOMETRY behind a REAL Angular wrapper —
 * that combination is the whole point, and a jsdom spec cannot replace it.
 */

/** An input group's core promise: its children form ONE continuous row. */
async function slottedRow(page: Page, groupIndex = 0) {
  return page.evaluate((index) => {
    const host = document.querySelectorAll('bs-input-group')[index];
    const wc = host.querySelector(':scope > mp-input-group')!;
    const assigned = (wc.shadowRoot!.querySelector('slot') as HTMLSlotElement).assignedElements();
    const boxes = assigned.map((el) => {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { tag: el.tagName, y: Math.round(b.y), width: +b.width.toFixed(1), flexGrow: cs.flexGrow };
    });
    return {
      boxes,
      lines: [...new Set(boxes.map((b) => b.y))].length,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, groupIndex);
}

/** Reach through the Angular wrapper into the phone input's own composed group. */
async function phoneInputInGroup(page: Page) {
  return page.evaluate(() => {
    const bs = document.querySelector('bs-input-group bs-phone-input')!;
    const mp = bs.querySelector('mp-phone-input')!;
    const inner = mp.shadowRoot!.querySelector('mp-input-group')!;
    const kids = [...inner.children].map((el) => {
      const b = el.getBoundingClientRect();
      return { tag: el.tagName, y: Math.round(b.y), width: +b.width.toFixed(1) };
    });
    const corners = (el: Element) => {
      const cs = getComputedStyle(el);
      return [
        cs.borderTopLeftRadius,
        cs.borderTopRightRadius,
        cs.borderBottomRightRadius,
        cs.borderBottomLeftRadius,
      ].map((v) => Math.round(parseFloat(v)));
    };
    return {
      hostWidth: +bs.getBoundingClientRect().width.toFixed(1),
      stacked: inner.hasAttribute('stacked'),
      kids,
      innerLines: [...new Set(kids.map((k) => k.y))].length,
      addonCorners: corners(document.querySelector('bs-input-group span.addon')!),
      pickerWidth: +inner.querySelector('mp-select')!.getBoundingClientRect().width.toFixed(1),
    };
  });
}

async function gotoPhoneInput(page: Page): Promise<void> {
  await page.goto('/basic/forms/phone-input');
  await page.waitForSelector('bs-input-group bs-phone-input');
  // Deterministic readiness: both custom elements upgraded and the composed inner
  // group present, rather than a bare `networkidle` that says nothing about layout.
  await page.waitForFunction(
    () =>
      !!customElements.get('mp-phone-input') &&
      !!document
        .querySelector('bs-input-group bs-phone-input mp-phone-input')
        ?.shadowRoot?.querySelector('mp-input-group'),
  );
}

test.describe('bs-input-group joins Angular-wrapped controls', () => {
  test('a grouped phone input fills its row instead of collapsing', async ({ page }) => {
    await gotoPhoneInput(page);
    const { boxes, lines, pageOverflow } = await slottedRow(page);
    const phone = boxes.find((b) => b.tag === 'BS-PHONE-INPUT')!;

    expect(lines).toBe(1);
    // The regression itself: the slotted node is an Angular host, and it must still
    // receive the group's sizing. It measured 0px wide when the rule named tags.
    expect(phone.width).toBeGreaterThan(200);
    expect(phone.flexGrow).toBe('1');
    expect(pageOverflow).toBe(0);
  });

  test('the composed inner group stays on one row and keeps its own picker width', async ({ page }) => {
    await gotoPhoneInput(page);
    const { stacked, innerLines, kids, pickerWidth } = await phoneInputInGroup(page);

    expect(stacked).toBe(false);
    expect(innerLines).toBe(1);
    expect(kids.every((k) => k.width > 0)).toBe(true);
    // The phone input pins its picker (flex/width/min-width, all `!important` in its
    // own tree). The group's shrink floor must not silently widen it — that floor is
    // a normal declaration precisely so a control can opt out.
    expect(pickerWidth).toBeLessThan(96);
  });

  test('a leading addon rounds its outer corners and squares only the seam', async ({ page }) => {
    await gotoPhoneInput(page);
    const { addonCorners } = await phoneInputInGroup(page);
    const [topLeft, topRight, bottomRight, bottomLeft] = addonCorners;

    // The `.input-group-text` port carried border, padding and background but
    // dropped the radius, so every corner resolved to 0 (PRD §14.3).
    expect(topLeft).toBeGreaterThan(0);
    expect(bottomLeft).toBeGreaterThan(0);
    expect(topRight).toBe(0);
    expect(bottomRight).toBe(0);
  });

  test('a toolbar of four bs-selects forms one row, not two', async ({ page }) => {
    // The pre-existing defect (PRD §1.2) that the WC migration claimed to fix and
    // only half did: corners paired, sizing never applied.
    await page.goto('/enterprise/scheduler');
    await page.waitForSelector('bs-input-group bs-select');
    await page.waitForFunction(() => !!customElements.get('mp-select'));

    const { boxes, lines, pageOverflow } = await slottedRow(page);
    expect(lines).toBe(1);
    expect(boxes.filter((b) => b.tag === 'BS-SELECT')).toHaveLength(4);
    expect(boxes.every((b) => b.width > 0)).toBe(true);
    expect(pageOverflow).toBe(0);
  });

  test('on a phone, controls shrink to a readable floor and then wrap', async ({ page }) => {
    // `width: 1%` alone would hold one row at ANY width, crushing the scheduler's
    // toolbar to 27px controls at 390px. The floor makes the flex line break instead
    // — `min-width` clamps the hypothetical main size, which is what line-breaking
    // measures. Both properties are required; this asserts the pair.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/enterprise/scheduler');
    await page.waitForSelector('bs-input-group bs-select');
    await page.waitForFunction(() => !!customElements.get('mp-select'));

    const { boxes, lines, pageOverflow } = await slottedRow(page);
    expect(lines).toBeGreaterThan(1);
    expect(Math.min(...boxes.filter((b) => b.tag === 'BS-SELECT').map((b) => b.width))).toBeGreaterThan(80);
    expect(pageOverflow).toBe(0);
  });

  test('a grouped phone input still stacks on a phone', async ({ page }) => {
    // Unreachable before the fix: the `width > 0` guard declined at zero width, so
    // the mobile layout was suppressed inside a group rather than merely wrong.
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPhoneInput(page);
    await expect.poll(async () => (await phoneInputInGroup(page)).stacked).toBe(true);

    const { innerLines, hostWidth } = await phoneInputInGroup(page);
    expect(hostWidth).toBeGreaterThan(200);
    expect(innerLines).toBe(2);
    expect((await slottedRow(page)).pageOverflow).toBe(0);
  });
});
