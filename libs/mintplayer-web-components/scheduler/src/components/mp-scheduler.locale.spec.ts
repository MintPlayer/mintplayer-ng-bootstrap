import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';

/**
 * R7 — the scheduler follows the browser's locale unless told otherwise.
 *
 * `DEFAULT_OPTIONS.locale` used to be the literal `'en-US'`, which is not a
 * neutral fallback but an instruction to `Intl` to render US English. A Dutch
 * browser showed "Mon, Oct 27" where the platform would have produced
 * "ma 27 okt" for free.
 *
 * These specs pin locales explicitly on both sides, so they assert the component's
 * behaviour rather than the machine's regional settings.
 */

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(locale?: string, view = 'timeline'): Promise<MpScheduler> {
  const el = document.createElement('mp-scheduler') as MpScheduler;
  document.body.appendChild(el);
  (el as unknown as { resources: unknown[] }).resources = [
    { id: 'alice', title: 'Alice', events: [] },
  ];
  (el as unknown as { date: Date }).date = new Date(2026, 6, 27); // Mon 27 Jul 2026
  if (locale) el.setAttribute('locale', locale);
  el.setAttribute('view', view);
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el;
}

function dayHeaders(el: MpScheduler): string[] {
  return [...el.shadowRoot!.querySelectorAll('.scheduler-timeline-slot-header')]
    .map((n) => n.textContent?.trim() ?? '')
    .filter((t) => t.length > 3); // slot-time headers are short; day headers are not
}

afterEach(() => {
  document.querySelectorAll('mp-scheduler').forEach((n) => n.remove());
});

describe('mp-scheduler — dates follow the locale (R7)', () => {
  it('renders Dutch day headers under nl-BE', async () => {
    const el = await mount('nl-BE');
    const headers = dayHeaders(el);

    expect(headers.length).toBeGreaterThan(0);
    // "ma 27 jul" — the user's own example. Day-before-month, lowercase, no comma.
    expect(headers[0].toLowerCase()).toContain('ma');
    expect(headers[0].toLowerCase()).toContain('jul');
    expect(headers[0]).toContain('27');
  });

  it('renders English day headers under en-US, in the American field order', async () => {
    const el = await mount('en-US');
    const headers = dayHeaders(el);

    // Sunday-first, because en-US starts its week on Sunday — see the week-start
    // assertions below. The reference date is Mon 27 Jul, so the week opens on
    // Sun 26 Jul rather than on the reference day itself.
    expect(headers[0]).toContain('Sun');
    expect(headers[0]).toContain('Jul');
    // en-US puts the month first; nl-BE puts the day first. Asserting the ORDER
    // is what proves Intl is doing the work rather than a template.
    expect(headers[0].indexOf('Jul')).toBeLessThan(headers[0].indexOf('26'));
  });

  it('starts the week on Sunday for en-US and Monday for nl-BE', async () => {
    // The week start is derived from the locale, not defaulted to Monday.
    // This is the visible half of that: the SAME reference date opens on a
    // different day depending only on the locale.
    const us = dayHeaders(await mount('en-US'));
    document.querySelectorAll('mp-scheduler').forEach((n) => n.remove());
    const be = dayHeaders(await mount('nl-BE'));

    expect(us[0]).toContain('Sun');
    expect(be[0].toLowerCase()).toContain('ma'); // maandag
    expect(us).toHaveLength(be.length);
  });

  it('honours an explicit firstDayOfWeek over the locale', async () => {
    const el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice', events: [] },
    ];
    (el as unknown as { date: Date }).date = new Date(2026, 6, 27);
    el.setAttribute('locale', 'en-US'); // would derive Sunday
    el.setAttribute('first-day-of-week', '1'); // but the consumer says Monday
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(dayHeaders(el)[0]).toContain('Mon');
  });

  it('accepts 7 for Sunday — the value Intl reports — instead of dropping it', async () => {
    // DayOfWeek is 0-6 and getWeekInfo says Sunday = 7. The attribute handler
    // used to discard anything outside 0-6 silently, leaving the week start
    // frozen with no error to explain why.
    const el = document.createElement('mp-scheduler') as MpScheduler;
    document.body.appendChild(el);
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice', events: [] },
    ];
    (el as unknown as { date: Date }).date = new Date(2026, 6, 27);
    el.setAttribute('locale', 'nl-BE'); // would derive Monday
    el.setAttribute('first-day-of-week', '7'); // Intl's spelling of Sunday
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(dayHeaders(el)[0].toLowerCase()).toContain('zo'); // zondag
  });

  it('puts the day before the month under nl-BE — the inverse order', async () => {
    const el = await mount('nl-BE');
    const header = dayHeaders(el)[0].toLowerCase();

    expect(header.indexOf('27')).toBeLessThan(header.indexOf('jul'));
  });

  it('produces different output for two locales with no other change', async () => {
    const nl = dayHeaders(await mount('nl-BE'))[0];
    document.querySelectorAll('mp-scheduler').forEach((n) => n.remove());
    const us = dayHeaders(await mount('en-US'))[0];

    expect(nl).not.toBe(us);
  });
});

describe('mp-scheduler — attributes before connection (robustness)', () => {
  it('does not throw when an attribute is set between createElement and append', async () => {
    // Completely idiomatic, and what a framework does when building an element
    // imperatively. attributeChangedCallback fires while shadowRoot is still
    // null, and every state listener runs — updateUI used to dereference it.
    const el = document.createElement('mp-scheduler') as MpScheduler;

    expect(() => {
      el.setAttribute('locale', 'nl-BE');
      el.setAttribute('view', 'timeline');
    }).not.toThrow();

    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // and the attributes set before connection are honoured once it renders
    expect(dayHeaders(el)[0].toLowerCase()).toContain('jul');
  });
});

describe('mp-scheduler — a runtime language change reaches the header (R7)', () => {
  it('re-labels the header buttons when options.messages changes', async () => {
    const el = await mount('en-US');
    const labels = () =>
      [...el.shadowRoot!.querySelectorAll('.scheduler-nav button, .scheduler-view-switcher button')]
        .map((b) => b.textContent!.trim())
        .filter(Boolean);

    expect(labels()).toContain('Today');

    // The header chrome is built once in firstUpdated, so its text used to freeze
    // at whatever messages held then: the title translated on every state change
    // and the buttons did not, giving a half-translated header.
    (el as unknown as { options: unknown }).options = {
      messages: { today: 'Vandaag', viewMonth: 'Maand' },
    };
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(labels()).toContain('Vandaag');
    expect(labels()).toContain('Maand');
    expect(labels()).not.toContain('Today');
  });
});
