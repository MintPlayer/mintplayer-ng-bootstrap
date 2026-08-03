import { afterEach, describe, expect, it } from 'vitest';
import './mp-calendar.element';
import type { MpCalendarElement } from './mp-calendar.element';

/**
 * The week-number column was hardcoded ISO-8601, which is only correct for a
 * Monday-start week. Once `firstDayOfWeek` became locale-derived — Sunday for
 * en-US and ja-JP — it labelled two consecutive rows of January 2026 "week 1"
 * and ran one short from then on.
 *
 * That column is a real `<th scope="row">`, so a screen reader read the wrong
 * number aloud, and the scheduler's own event editor renders this calendar.
 */

async function mount(setup: (el: MpCalendarElement) => void): Promise<MpCalendarElement> {
  const el = document.createElement('mp-calendar') as MpCalendarElement;
  setup(el);
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  return el;
}

function weekNumbers(el: MpCalendarElement): number[] {
  return [...el.shadowRoot!.querySelectorAll('th[scope="row"]')].map((n) =>
    Number(n.textContent?.trim()),
  );
}

afterEach(() => {
  document.querySelectorAll('mp-calendar').forEach((n) => n.remove());
});

describe('mp-calendar — week numbers follow the week start', () => {
  it('numbers January 2026 without repeating a week under a SUNDAY start', async () => {
    const el = await mount((c) => {
      c.currentMonth = new Date(2026, 0, 1);
      c.locale = 'en-US';
      c.firstDayOfWeek = 0;
    });

    const numbers = weekNumbers(el);
    expect(numbers.length).toBeGreaterThan(0);
    // The regression: [1, 1, 2, 3, 4] — two rows both called week 1.
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers[0]).toBe(1);
  });

  it('still produces ISO numbering under a MONDAY start', async () => {
    const el = await mount((c) => {
      c.currentMonth = new Date(2026, 0, 1);
      c.locale = 'nl-BE';
      c.firstDayOfWeek = 1;
    });

    // ISO: the week of Dec 29 2025 – Jan 4 2026 is 2026's week 1.
    expect(weekNumbers(el).slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('increments by exactly one down every month it renders', async () => {
    for (const firstDayOfWeek of [0, 1] as const) {
      for (const month of [0, 5, 11]) {
        const el = await mount((c) => {
          c.currentMonth = new Date(2026, month, 1);
          c.locale = firstDayOfWeek === 0 ? 'en-US' : 'nl-BE';
          c.firstDayOfWeek = firstDayOfWeek;
        });

        const numbers = weekNumbers(el);
        for (let i = 1; i < numbers.length; i++) {
          const step = numbers[i] - numbers[i - 1];
          // 1 normally; a year rollover restarts at 1 from 52 or 53.
          expect(
            step === 1 || (numbers[i] === 1 && numbers[i - 1] >= 52),
            `month ${month}, firstDay ${firstDayOfWeek}: ${numbers.join(',')}`,
          ).toBe(true);
        }
        el.remove();
      }
    }
  });

  it('handles the year boundary — Dec 2026 ends in ISO week 53, not week 1', async () => {
    const el = await mount((c) => {
      c.currentMonth = new Date(2026, 11, 1);
      c.locale = 'nl-BE';
      c.firstDayOfWeek = 1;
    });

    // 2026-12-31 is a Thursday, so the Dec 28 – Jan 3 week belongs to 2026 and
    // is its 53rd. 2027's week 1 does not start until Jan 4. (The naive
    // expectation — that the last row of December is always week 1 — is wrong,
    // and is the kind of thing an ISO implementation must get right.)
    const numbers = weekNumbers(el);
    expect(numbers[numbers.length - 1]).toBe(53);
  });

  it('rolls into week 1 where the year boundary really does — Dec 2024', async () => {
    const el = await mount((c) => {
      c.currentMonth = new Date(2024, 11, 1);
      c.locale = 'nl-BE';
      c.firstDayOfWeek = 1;
    });

    // 2024-12-30 is a Monday and 2025-01-02 a Thursday, so that week IS 2025's
    // week 1 — the mirror image of the case above.
    expect(weekNumbers(el).slice(-1)[0]).toBe(1);
  });
});
