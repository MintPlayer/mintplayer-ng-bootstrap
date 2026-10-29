import type { Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

/**
 * PRD #437 S4: one virtual window driving the React and Vue datatables over 10k
 * rows. A front that reconciled the whole list on scroll would show it twice:
 * the DOM would grow with the scrolled distance, and frames would stretch.
 *
 * Asserted: the DOM bound, a median scroll step within one frame (the S4
 * criterion), and no frame anywhere near what a whole-list pass over 10k rows
 * costs (far above any measured frame). The intervals and every long animation frame are
 * attached as an annotation (the S4 figures in the PRD come from it). The tail
 * is not asserted to the millisecond: a shared runner's frame clock is not a
 * benchmark, and Vue measured an occasional ~50-80ms frame (render of the new
 * window plus style and layout) about once in 60 steps.
 */
export interface VirtualWindowSuiteOptions {
  framework: string;
  path: string;
}

const ROWS = 10_000;
const STEPS = 60;
/** Rows a ~40px row height window can show plus overscan, with headroom. */
const MAX_RENDERED_ROWS = 80;

export function virtualWindowSuite(test: Test, expect: Expect, options: VirtualWindowSuiteOptions): void {
  // In fill mode the datatable root itself scrolls (datatable.core.ts scroller()), not .datatable-scroll.
  const scroller = (page: Page) => page.locator('[data-demo="fill-virtual"] div.datatable');

  test.describe(`${options.framework} datatable virtual window (S4, ${ROWS} rows)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(options.path);
      // Server HTML already holds the first rows; scrolling before the core attaches moves nothing.
      await scroller(page).and(page.locator('[data-mp-hydrated]')).waitFor();
      await scroller(page).scrollIntoViewIfNeeded();
    });

    test('renders a bounded window however far it scrolls, and reaches the last row', async ({ page }) => {
      const table = scroller(page);
      await expect(table.locator('table')).toHaveAttribute('aria-rowcount', String(ROWS + 1));

      const samples = await table.evaluate(async (el, steps) => {
        const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
        const out: { rendered: number; first: number; last: number }[] = [];
        const stride = (el.scrollHeight - el.clientHeight) / steps;
        for (let i = 1; i <= steps; i++) {
          el.scrollTop = Math.round(stride * i);
          await frame();
          await frame();
          const rows = [...el.querySelectorAll('tbody tr[aria-rowindex]')];
          const index = (row?: Element) => Number(row?.getAttribute('aria-rowindex') ?? 0);
          out.push({ rendered: rows.length, first: index(rows[0]), last: index(rows[rows.length - 1]) });
        }
        return out;
      }, STEPS);

      expect(Math.max(...samples.map((s) => s.rendered))).toBeLessThanOrEqual(MAX_RENDERED_ROWS);
      // The window moved with the scroll, monotonically, all the way down.
      expect(samples.every((s, i) => i === 0 || s.first >= samples[i - 1].first)).toBe(true);
      expect(samples[samples.length - 1].last).toBe(ROWS + 1);
    });

    test('a scroll step fits one frame, and no frame costs a whole-list pass', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Long Animation Frame timing is Chromium-only (the S4 criterion is Chromium).');
      const table = scroller(page);
      const result = await table.evaluate(async (el, steps) => {
        const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
        // The first window move after load renders rows for the first time (Vue measured one ~35ms
        // script in that frame, once per page): a start-up cost, not a per-step one. Pay it first.
        el.scrollTop = 400;
        await frame();
        await frame();
        el.scrollTop = 0;
        await frame();
        await frame();
        const entries: PerformanceEntry[] = [];
        const observer = new PerformanceObserver((list) => entries.push(...list.getEntries()));
        observer.observe({ type: 'long-animation-frame', buffered: false });
        const deltas: number[] = [];
        const start = await frame();
        let last = start;
        for (let i = 1; i <= steps; i++) {
          el.scrollTop += 400;
          const now = await frame();
          deltas.push(now - last);
          last = now;
        }
        await frame();
        await frame();
        observer.disconnect();
        // Only frames that overlap the scroll: page start-up work before it is not scroll cost.
        const long = entries.filter((entry) => entry.startTime + entry.duration > start && entry.startTime < last).map((entry) => entry.duration);
        const sorted = [...deltas].sort((a, b) => a - b);
        const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
        return { long, p50: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] };
      }, STEPS);

      test.info().annotations.push({
        type: 'S4 frame interval (ms)',
        description: `p50 ${result.p50.toFixed(1)}, p95 ${result.p95.toFixed(1)}, max ${result.max.toFixed(1)}; long frames: [${result.long.map((d) => d.toFixed(0)).join(', ')}]`,
      });
      // One frame at 60Hz is 16.7ms; the rAF clock rounds to it.
      expect(result.p50).toBeLessThanOrEqual(17.5);
      // The bar is for O(rows) work, not runner jitter: the measured tail stays under 100ms.
      expect(Math.max(0, ...result.long)).toBeLessThan(250);
    });
  });
}
