import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Spike 0.1a — the BEHAVIOURAL half of D1 (<details>/<summary> accordion).
   These are the questions that can OVERTURN the decision, per the plan's
   fail-path: "Fail on disabled or on the event contract -> fall back to
   <details> for the no-JS tier only". Pixel parity is spike 0.1b, which needs a
   real demo route with Bootstrap CSS and cannot be judged by a unit assertion. */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(HERE, 'fixture.js'), 'utf8');

const PAGE = `
  <button id="before">before</button>
  <mp-details-accordion id="a" group="grp-a"></mp-details-accordion>
  <mp-details-accordion id="b" group="grp-a"></mp-details-accordion>
  <button id="after">after</button>
`;

async function setup(page: Page) {
  await page.setContent(PAGE);
  await page.addScriptTag({ content: FIXTURE });
  await page.waitForFunction(() => !!customElements.get('mp-details-accordion'));
  await page.evaluate(() => (window as any).toggleLog.splice(0));
}

const host = (page: Page, id: string) => page.locator(`#${id}`);
const inner = (page: Page, hostId: string, sel: string) =>
  page.locator(`#${hostId}`).locator(sel);
const log = (page: Page) => page.evaluate(() => (window as any).toggleLog);
const openStates = (page: Page, hostId: string) =>
  page.evaluate(
    (id) => (document.getElementById(id) as any).openStates(),
    hostId,
  );

test.describe('0.1a — `name` exclusivity scoping (the whole single-open behaviour rests on this)', () => {
  test.beforeEach(({ page }) => setup(page));

  test('two <details name> in the SAME shadow root are mutually exclusive', async ({ page }) => {
    await inner(page, 'a', '#s1').click();
    expect(await openStates(page, 'a')).toEqual([true, false, false]);

    await inner(page, 'a', '#s2').click();
    // Opening the second must have closed the first.
    expect(await openStates(page, 'a')).toEqual([false, true, false]);
  });

  test('two accordions in DIFFERENT shadow roots with the SAME name do not close each other', async ({
    page,
  }) => {
    // Grouping is per node tree, the same rule as radio buttons. That is
    // reasoning by analogy, and analogy is what needed checking once already on
    // this decision — so assert it directly.
    await inner(page, 'a', '#s1').click();
    await inner(page, 'b', '#s1').click();
    expect(await openStates(page, 'a')).toEqual([true, false, false]);
    expect(await openStates(page, 'b')).toEqual([true, false, false]);
  });
});

test.describe('0.1a — the toggle-event contract', () => {
  test.beforeEach(({ page }) => setup(page));

  /* Every assertion in this block must POLL for the log. These three originally
     read it synchronously after the click, which passed on one run and failed on
     the next — flaky for precisely the reason this spike discovered: `toggle` is
     delivered on a queued task, so "click then read" is a race. Left as a marker:
     if a test here ever reads `toggleLog` without polling, it is wrong. */
  test('the UA fires `toggle` on the sibling it auto-closes', async ({ page }) => {
    // Assumed yes, never verified, and every piece of state sync depends on it:
    // the is-active light-DOM markers, #closeNested, and the
    // mp-accordion-tab-toggle contract all need a signal when exclusivity closes
    // a tab the user never touched.
    await inner(page, 'a', '#s1').click();
    await expect.poll(async () => (await log(page)).length).toBeGreaterThan(0);
    await page.evaluate(() => (window as any).toggleLog.splice(0));
    await inner(page, 'a', '#s2').click();

    await expect
      .poll(async () => (await log(page)).map((e: any) => `${e.id}:${e.open}`).sort())
      .toEqual(['d1:false', 'd2:true']);
    console.log(`toggle log on exclusive switch: ${JSON.stringify(await log(page))}`);
  });

  test('`toggle` is not cancellable (so a disabled tab cannot be stopped in the handler)', async ({
    page,
  }) => {
    await inner(page, 'a', '#s1').click();
    await expect.poll(async () => (await log(page)).length).toBeGreaterThan(0);
    expect((await log(page)).every((e: any) => e.cancelable === false)).toBe(true);
  });

  test('`toggle` carries the post-change state, so handlers observe the final value', async ({
    page,
  }) => {
    await inner(page, 'a', '#s1').click();
    await expect.poll(async () => (await log(page)).find((e: any) => e.id === 'd1')?.open).toBe(true);
  });
});

test.describe('0.1a — disabled tabs (<summary> cannot be disabled; is the workaround inert?)', () => {
  test.beforeEach(({ page }) => setup(page));

  test('pointer-events:none + aria-disabled makes a disabled summary unclickable with NO flash', async ({
    page,
  }) => {
    const events: unknown[] = [];
    page.on('console', (m) => events.push(m.text()));

    // force:true bypasses Playwright's own actionability checks, so this tests
    // the browser's behaviour rather than Playwright's guard.
    await inner(page, 'a', '#s3').click({ force: true });
    expect(await openStates(page, 'a')).toEqual([false, false, false]);

    // No toggle at all means no open-then-close correction, which is what would
    // have flashed. `toggle` is not cancellable, so a flash is the only other
    // possible outcome — its absence is the gate.
    // Asserting ABSENCE of an async event needs a settle window, or it passes
    // merely because the queued task has not run yet.
    await page.waitForTimeout(100);
    expect(await log(page)).toEqual([]);
  });

  test('a disabled summary is not reachable by Tab', async ({ page }) => {
    await host(page, 'a').locator('#s1').focus();
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      let el: Element | null = document.activeElement;
      while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
      return el?.id ?? 'none';
    });
    expect(active).not.toBe('s3');
  });

  test('Enter on a disabled summary does not open it', async ({ page }) => {
    await page.evaluate(() => {
      const h = document.getElementById('a') as any;
      h.shadowRoot.getElementById('s3').focus();
    });
    await page.keyboard.press('Enter');
    expect(await openStates(page, 'a')).toEqual([false, false, false]);
  });
});

test.describe('0.1a — native activation and keyboard', () => {
  test.beforeEach(({ page }) => setup(page));

  /* FINDING — `toggle` is ASYNCHRONOUS, and this test originally asserted it was
     synchronous. It passed in Firefox and failed in Chromium and WebKit: the
     state had already changed while the event had not yet been delivered.
     Per spec the UA *queues* a details-toggle task rather than dispatching
     inline, so `details.open` is authoritative immediately but the event is not.

     Consequence for the accordion, and it is a real constraint on D1: the element
     must not derive the `is-active` light-DOM markers or re-emit
     `mp-accordion-tab-toggle` from an assumed 1:1 synchronous `toggle`. It should
     treat `toggle` purely as a notification and re-read the current `open` state
     of every tab — which is also coalescing-safe (see the next test). */
  test('activation eventually delivers exactly one toggle per state change (async)', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const h = document.getElementById('a') as any;
      h.shadowRoot.getElementById('s1').focus();
    });

    await page.keyboard.press('Enter');
    // State is correct immediately...
    expect(await openStates(page, 'a')).toEqual([true, false, false]);
    // ...the event arrives on a queued task.
    await expect.poll(async () => (await log(page)).length).toBe(1);

    await page.keyboard.press('Enter');
    expect(await openStates(page, 'a')).toEqual([false, false, false]);
    await expect.poll(async () => (await log(page)).length).toBe(2);
  });

  test('rapid open/close within one task is COALESCED to a single toggle', async ({ page }) => {
    // Spec removes an already-queued details-toggle task rather than queueing a
    // second, so a same-task flip-flop is not observable as two events. Anything
    // counting events to track state would drift here.
    await page.evaluate(() => {
      const d = (document.getElementById('a') as any).shadowRoot.getElementById('d1');
      d.open = true;
      d.open = false;
    });
    await page.waitForTimeout(50);
    const events = await log(page);
    console.log(`coalesced flip-flop log: ${JSON.stringify(events)}`);
    expect(await openStates(page, 'a')).toEqual([false, false, false]);
    // Recorded, not gated: the count is what tells the implementation whether it
    // may count events at all. It may not.
    expect(events.length).toBeLessThanOrEqual(1);
  });

  test('a summary is in the tab order without an explicit tabindex', async ({ page }) => {
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      let el: Element | null = document.activeElement;
      while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
      return el?.id ?? 'none';
    });
    expect(active).toBe('s1');
  });
});

test.describe('0.1a — the two wins that offset the risks', () => {
  test.beforeEach(({ page }) => setup(page));

  test('closed content is out of the tab order AND the a11y tree with no CSS at all', async ({
    page,
  }) => {
    // This is the accordion Critical in PRD 4.5: the current implementation
    // keeps collapsed panels focusable.
    const snapshot = await page.locator('body').ariaSnapshot();
    expect(snapshot).not.toContain('in one');

    await host(page, 'a').locator('#s1').focus();
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      let el: Element | null = document.activeElement;
      while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
      return el?.id ?? 'none';
    });
    expect(active).not.toBe('b1');
  });

  test('opening exposes the panel content to both', async ({ page }) => {
    await inner(page, 'a', '#s1').click();
    expect(await page.locator('body').ariaSnapshot()).toContain('in one');
  });

  test('initial state is expressible as a plain [open] attribute (fixes the DSD gap)', async ({
    page,
  }) => {
    // The current radio state machine cannot express this: the generator has no
    // active tab at generation time (PRD 4.6).
    await page.evaluate(() => {
      const h = document.getElementById('a') as any;
      h.shadowRoot.getElementById('d2').setAttribute('open', '');
    });
    expect(await openStates(page, 'a')).toEqual([false, true, false]);
    expect(await page.locator('body').ariaSnapshot()).toContain('in two');
  });
});

test.describe('0.1a — marker removal and summary layout', () => {
  test.beforeEach(({ page }) => setup(page));

  test('the disclosure marker contributes no width in any engine', async ({ page }) => {
    // A leftover triangle shifts the label; measuring the text offset catches it
    // in all three engines without a screenshot.
    const offset = await page.evaluate(() => {
      const h = document.getElementById('a') as any;
      const summary = h.shadowRoot.getElementById('s1');
      const range = document.createRange();
      range.selectNodeContents(summary);
      return range.getBoundingClientRect().left - summary.getBoundingClientRect().left;
    });
    console.log(`marker-induced text offset: ${offset}px`);
    expect(Math.abs(offset)).toBeLessThan(2);
  });

  test('display:flex applies to <summary> (it defaults to list-item)', async ({ page }) => {
    const display = await page.evaluate(() => {
      const h = document.getElementById('a') as any;
      return getComputedStyle(h.shadowRoot.getElementById('s1')).display;
    });
    expect(display).toBe('flex');
  });

  test('the ::after chevron still renders alongside ::marker removal', async ({ page }) => {
    const content = await page.evaluate(() => {
      const h = document.getElementById('a') as any;
      return getComputedStyle(h.shadowRoot.getElementById('s1'), '::after').content;
    });
    expect(content).toContain('>');
  });
});
