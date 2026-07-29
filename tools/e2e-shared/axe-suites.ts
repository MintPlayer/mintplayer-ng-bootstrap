import AxeBuilder from '@axe-core/playwright';
import type { Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

export interface AxeRouteAllowance {
  /** axe rule id to disable on this route. */
  rule: string;
  /** WHY it is allowed — an issue link or a code-grounded justification. */
  reason: string;
}

export interface AxeRoute {
  path: string;
  /** Extra readiness beyond `goto` (hydration predicate etc.). */
  ready?: (page: Page) => Promise<void>;
  /**
   * Optional second state: perform one interaction, then audit again. Load +
   * one interaction per route is the gate's contract — deeper journeys belong
   * in the component's own e2e spec.
   */
  interact?: (page: Page) => Promise<void>;
  /** Per-route allow-list. NEVER a lowered threshold — each entry needs a reason. */
  allow?: AxeRouteAllowance[];
}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * Rules off for EVERY route, each with its standing reason:
 * - color-contrast: contrast is asserted via the visual-regression specs;
 *   under the dev server axe intermittently samples mid-reload paints
 *   (the ribbon axe spec documents the same flake).
 * - aria-valid-attr-value: aria-controls/labelledby on shadow hosts point at
 *   slotted light-DOM ids. axe cannot resolve IDREFs across the shadow
 *   boundary, but ARIA + modern screen readers handle the composition; the
 *   repo's own `expectIdrefResolves` unit helper guards the real wiring.
 */
const GLOBAL_DISABLED = ['color-contrast', 'aria-valid-attr-value'];

async function audit(page: Page, route: AxeRoute, expect: Expect): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    .disableRules([...GLOBAL_DISABLED, ...(route.allow ?? []).map((a) => a.rule)])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    blocking.map((v) => ({
      rule: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
      help: v.helpUrl,
    })),
    `axe violations on ${route.path}`,
  ).toEqual([]);
}

/**
 * The programme's WCAG gate: fail on any serious/critical axe finding, per
 * route, two states (load + one interaction). Lives in its own spec files +
 * playwright config + `e2e-a11y` Nx target so `nx affected --target=e2e`
 * can never silence it.
 */
export function axeAuditSuite(test: Test, expect: Expect, routes: AxeRoute[]) {
  test.describe('axe gate', () => {
    // axe's tree walk is slow under the dev server (ribbon spec precedent).
    test.slow();

    const suites = routes.map((route) => {
      test.describe(route.path, () => {
        test.beforeEach(async ({ page }) => {
          await page.goto(route.path);
          await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
            /* HMR keeps the socket open in dev; settle briefly, never hang */
          });
          await route.ready?.(page);
        });

        test('on load', async ({ page }) => {
          await audit(page, route, expect);
        });

        if (route.interact) {
          test('after interaction', async ({ page }) => {
            await route.interact?.(page);
            await audit(page, route, expect);
          });
        }
      });
      return route.path;
    });
    void suites;
  });
}

/**
 * The no-JS pass: same gate over the server-rendered tier. Caller's spec file
 * applies `test.use({ javaScriptEnabled: false })` at file level. Load state
 * only — interactivity without JS is covered by the dedicated nojs suites.
 */
export function axeNojsSuite(test: Test, expect: Expect, routes: AxeRoute[]) {
  test.describe('axe gate (no JS, SSR tier)', () => {
    test.slow();

    const suites = routes.map((route) => {
      test(route.path, async ({ page }) => {
        await page.goto(route.path);
        await audit(page, route, expect);
      });
      return route.path;
    });
    void suites;
  });
}
