import type { Locator, Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

export interface RovingSuiteOptions {
  /** Suite title, e.g. `radio-group roving focus`. */
  name: string;
  /** Demo route the widget lives on. */
  path: string;
  /**
   * The composite widget. Used for the tab-exit containment check, so it must
   * be the outermost element the roving pattern owns.
   */
  container: (page: Page) => Locator;
  /**
   * The focusable items, in DOM order. Playwright CSS pierces shadow roots, so
   * this can (and usually must) target the REAL focus targets — e.g. the
   * `<input>` inside each `<mp-radio>`, not the host.
   */
  items: (page: Page) => Locator;
  /** Which arrow key moves forward within the widget. Default `ArrowRight`. */
  forwardKey?: 'ArrowRight' | 'ArrowDown';
  /** Extra readiness beyond `goto` (hydration predicates etc.). */
  ready?: (page: Page) => Promise<void>;
  /** Interaction that reveals the widget (open a dropdown, focus a field). */
  setup?: (page: Page) => Promise<void>;
  /**
   * Set when the demo renders an item that is disabled: index of that item.
   * Asserts arrows skip it. Omit when the demo has no disabled item.
   */
  disabledIndex?: number;
}

async function activeElementWithin(container: Locator): Promise<boolean> {
  return container.evaluate((el: Element) => {
    // Walk into shadow roots: document.activeElement stops at the outermost
    // host, but containment must be judged against the deep active element's
    // host chain.
    const deepActive = (() => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active;
    })();
    const containedViaHosts = (node: Element | null): boolean => {
      if (!node) return false;
      if (el.contains(node)) return true;
      const root = node.getRootNode();
      return root instanceof ShadowRoot ? containedViaHosts(root.host) : false;
    };
    return containedViaHosts(deepActive);
  });
}

/**
 * The one roving-tabindex contract, asserted per consumer from the demo apps
 * (never a synthetic harness — repo convention is to verify through the
 * wrappers and demos). Matches the `accordion-suites.ts` parameterised shape.
 *
 * The load-bearing pair of assertions:
 *  - "every control reachable" alone is NOT the invariant — a widget where
 *    every item is tabbable passes it and is still broken (the `mp-time-list`
 *    97-tab-stops finding). The invariant is exactly ONE tab stop inside.
 *  - modified arrows (Alt/Ctrl/Meta) are browser/OS chords and must pass
 *    through untouched.
 */
export function rovingFocusSuite(test: Test, expect: Expect, options: RovingSuiteOptions) {
  const forward = options.forwardKey ?? 'ArrowRight';

  async function goto(page: Page) {
    await page.goto(options.path);
    await options.ready?.(page);
    await options.setup?.(page);
    // The widget is ready when its items exist and one carries the tab stop.
    await expect
      .poll(async () =>
        options.items(page).evaluateAll((els) => els.filter((el) => (el as HTMLElement).tabIndex === 0).length),
      )
      .toBe(1);
  }

  test.describe(`${options.name} (roving focus)`, () => {
    test('exactly ONE tab stop inside the composite', async ({ page }) => {
      await goto(page);
      const tabIndexes = await options
        .items(page)
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).tabIndex));
      expect(tabIndexes.length).toBeGreaterThan(1);
      expect(tabIndexes.filter((t) => t === 0)).toHaveLength(1);
      expect(tabIndexes.filter((t) => t === -1)).toHaveLength(tabIndexes.length - 1);
    });

    test('arrows move focus within; the tab stop follows', async ({ page }) => {
      await goto(page);
      const items = options.items(page);
      const start = await items.evaluateAll((els) => els.findIndex((el) => (el as HTMLElement).tabIndex === 0));
      await items.nth(start).focus();
      await page.keyboard.press(forward);

      const after = await items.evaluateAll((els) => els.findIndex((el) => (el as HTMLElement).tabIndex === 0));
      expect(after).not.toBe(start);
      await expect(items.nth(after)).toBeFocused();
    });

    test('Home and End jump to the first and last enabled item', async ({ page }) => {
      await goto(page);
      const items = options.items(page);
      const enabled = await items.evaluateAll((els) =>
        els.map((el, index) => ({ index, disabled: (el as HTMLInputElement).disabled === true })).filter((x) => !x.disabled).map((x) => x.index),
      );
      const start = await items.evaluateAll((els) => els.findIndex((el) => (el as HTMLElement).tabIndex === 0));
      await items.nth(start).focus();

      await page.keyboard.press('End');
      await expect(items.nth(enabled[enabled.length - 1])).toBeFocused();
      await page.keyboard.press('Home');
      await expect(items.nth(enabled[0])).toBeFocused();
    });

    test('modified arrows are NOT intercepted — chords stay with the platform', async ({ page }) => {
      await goto(page);
      const items = options.items(page);
      const start = await items.evaluateAll((els) => els.findIndex((el) => (el as HTMLElement).tabIndex === 0));
      await items.nth(start).focus();
      await page.keyboard.press(`Control+${forward}`);
      // Focus must not have roved; the chord belongs to the browser/OS.
      await expect(items.nth(start)).toBeFocused();
    });

    test('one Tab exits the item ring', async ({ page }) => {
      // NOT "exits the container": a tab widget correctly sends Tab from the
      // active tab to its tabpanel, which is inside the same component. The
      // one-tab-stop invariant is about the ITEM RING — consecutive Tabs must
      // never walk the items (the mp-time-list 97-tab-stops finding).
      await goto(page);
      const items = options.items(page);
      const start = await items.evaluateAll((els) => els.findIndex((el) => (el as HTMLElement).tabIndex === 0));
      await items.nth(start).focus();
      expect(await activeElementWithin(options.container(page))).toBe(true);

      await page.keyboard.press('Tab');
      const focusedItem = await items.evaluateAll((els) => {
        const deepActive = (() => {
          let active: Element | null = document.activeElement;
          while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
          return active;
        })();
        return els.findIndex((el) => el === deepActive);
      });
      expect(focusedItem).toBe(-1);
    });

    if (options.disabledIndex !== undefined) {
      const disabledIndex = options.disabledIndex;
      test('arrows skip the disabled item', async ({ page }) => {
        await goto(page);
        const items = options.items(page);
        // Walk the whole ring once; the disabled item must never take focus.
        const count = await items.count();
        const start = await items.evaluateAll((els) => els.findIndex((el) => (el as HTMLElement).tabIndex === 0));
        await items.nth(start).focus();
        const visited: number[] = [];
        // Sequential on purpose: each press must land before the next reads
        // the rove state.
        for (const _ of Array.from({ length: count })) {
          await page.keyboard.press(forward);
          visited.push(
            await items.evaluateAll((els) => els.findIndex((el) => (el as HTMLElement).tabIndex === 0)),
          );
        }
        expect(visited).not.toContain(disabledIndex);
      });
    }
  });
}
