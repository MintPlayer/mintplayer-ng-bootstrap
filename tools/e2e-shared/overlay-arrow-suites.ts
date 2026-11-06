import type { Locator, Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

export interface OverlayArrowSuiteOptions {
  /** Route prefix of the overlay pages: '/overlays' (ng) or '/overlay' (react, vue). */
  prefix: string;
  /** The four triggers' accessible names, one per requested side. */
  triggers: readonly string[];
}

interface ArrowGeometry {
  side: string;
  position: string;
  panel: { left: number; top: number; right: number; bottom: number };
  arrow: { left: number; top: number; right: number; bottom: number };
}

/**
 * Where the panel's arrow really sits. The side is read from the panel's own
 * `bs-<kind>-<side>` class, not from the trigger, because a panel flips when
 * there is no room.
 */
function arrowGeometry(panel: Locator, kind: 'tooltip' | 'popover'): Promise<ArrowGeometry> {
  return panel.evaluate((el, k) => {
    const arrow = el.querySelector(`.${k}-arrow`) as HTMLElement;
    const box = (r: DOMRect) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    const side = [...el.classList].find((c) => c.startsWith(`bs-${k}-`))?.slice(`bs-${k}-`.length) ?? '';
    return {
      side,
      position: getComputedStyle(arrow).position,
      panel: box(el.getBoundingClientRect()),
      arrow: box(arrow.getBoundingClientRect()),
    };
  }, kind);
}

/**
 * #463: the arrow sits outside the panel's edge on the side the panel lands,
 * centred on that edge. Bootstrap leaves its position to Popper, so a missing
 * `position: absolute` turns it into an in-flow row at the panel's top-left.
 * 'start' / 'end' are physical in the demos (LTR).
 */
function expectArrowOnEdge(expect: Expect, g: ArrowGeometry) {
  const { panel, arrow } = g;
  expect(g.position, 'arrow is positioned').toBe('absolute');
  const centreX = (b: ArrowGeometry['panel']) => (b.left + b.right) / 2;
  const centreY = (b: ArrowGeometry['panel']) => (b.top + b.bottom) / 2;
  switch (g.side) {
    case 'top':
      expect(arrow.top).toBeGreaterThanOrEqual(panel.bottom - 1.5);
      expect(Math.abs(centreX(arrow) - centreX(panel))).toBeLessThanOrEqual(1.5);
      break;
    case 'bottom':
      expect(arrow.bottom).toBeLessThanOrEqual(panel.top + 1.5);
      expect(Math.abs(centreX(arrow) - centreX(panel))).toBeLessThanOrEqual(1.5);
      break;
    case 'start':
      expect(arrow.left).toBeGreaterThanOrEqual(panel.right - 1.5);
      expect(Math.abs(centreY(arrow) - centreY(panel))).toBeLessThanOrEqual(1.5);
      break;
    case 'end':
      expect(arrow.right).toBeLessThanOrEqual(panel.left + 1.5);
      expect(Math.abs(centreY(arrow) - centreY(panel))).toBeLessThanOrEqual(1.5);
      break;
    default:
      throw new Error(`panel carries no side class: '${g.side}'`);
  }
}

/** Geometry of the tooltip and popover arrows, on every side (#463). */
export function overlayArrowSuite(test: Test, expect: Expect, options: OverlayArrowSuiteOptions) {
  const trigger = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).first();

  test.describe('overlay arrows (#463)', () => {
    for (const name of options.triggers) {
      test(`tooltip arrow sits on the panel's edge: ${name}`, async ({ page }) => {
        await page.goto(`${options.prefix}/tooltip`);
        const tooltip = page.locator('.tooltip.show');
        // Hover until it takes: a hover on the server-rendered node before the
        // client takes over opens nothing, and a hover is not re-fired by itself.
        await expect(async () => {
          await page.mouse.move(0, 0);
          await trigger(page, name).hover();
          await expect(tooltip).toBeVisible({ timeout: 1_000 });
        }).toPass({ timeout: 15_000 });
        expectArrowOnEdge(expect, await arrowGeometry(tooltip, 'tooltip'));
      });

      test(`popover arrow sits on the panel's edge: ${name}`, async ({ page }) => {
        await page.goto(`${options.prefix}/popover`);
        const popover = page.locator('.popover.show');
        await expect(async () => {
          if (!(await popover.isVisible())) {
            await trigger(page, name).click();
          }
          await expect(popover).toBeVisible({ timeout: 1_000 });
        }).toPass({ timeout: 15_000 });
        expectArrowOnEdge(expect, await arrowGeometry(popover, 'popover'));
      });
    }
  });
}
