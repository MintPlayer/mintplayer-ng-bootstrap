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
    // Since #437 the bs-input-group host IS the .input-group: its children are the items.
    const host = document.querySelectorAll('bs-input-group')[index];
    const boxes = [...host.children].map((el) => {
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

/** The phone input's own group: picker, dial-code addon and number field (light DOM since #437). */
async function phoneInputInGroup(page: Page) {
  return page.evaluate(() => {
    const bs = document.querySelector('bs-input-group bs-phone-input')!;
    const inner = bs.querySelector('.phone-input > .input-group')!;
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
      // Stacking is a container query now, not an attribute: the picker takes its own row.
      stacked: new Set(kids.map((k) => k.y)).size > 1,
      kids,
      innerLines: [...new Set(kids.map((k) => k.y))].length,
      addonCorners: corners(document.querySelector('bs-input-group > span.addon')!),
      pickerWidth: +inner.querySelector('select')!.getBoundingClientRect().width.toFixed(1),
    };
  });
}

async function gotoPhoneInput(page: Page): Promise<void> {
  await page.goto('/basic/forms/phone-input');
  // Server-rendered, so the group is there at once; the flag marks the live, hydrated field.
  await page.waitForSelector('bs-input-group bs-phone-input .phone-input .flag svg');
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
    // The phone input pins its picker (flex: 0 0 auto, width: auto, min-width: 0).
    // The group's shrink floor must not silently widen it.
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
    await page.waitForSelector('bs-input-group bs-select select');

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
    await page.waitForSelector('bs-input-group bs-select select');

    const { boxes, lines, pageOverflow } = await slottedRow(page);
    expect(lines).toBeGreaterThan(1);
    expect(Math.min(...boxes.filter((b) => b.tag === 'BS-SELECT').map((b) => b.width))).toBeGreaterThan(80);
    expect(pageOverflow).toBe(0);
  });

  test('a grouped phone input still stacks on a phone', async ({ page }) => {
    // A container query on the phone input itself: it stacks by its own width, so
    // a field inside a group stacks exactly like one on its own.
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPhoneInput(page);
    await expect.poll(async () => (await phoneInputInGroup(page)).stacked).toBe(true);

    const { innerLines, hostWidth } = await phoneInputInGroup(page);
    expect(hostWidth).toBeGreaterThan(200);
    expect(innerLines).toBe(2);
    expect((await slottedRow(page)).pageOverflow).toBe(0);
  });
});
