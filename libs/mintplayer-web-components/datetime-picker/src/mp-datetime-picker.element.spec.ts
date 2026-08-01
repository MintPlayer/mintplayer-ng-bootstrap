import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-datetime-picker.element';
import type { MpDatetimePickerElement } from './mp-datetime-picker.element';
import '@mintplayer/web-components/calendar';
import '@mintplayer/web-components/timepicker';

async function flush(el: MpDatetimePickerElement): Promise<void> {
  await el.updateComplete;
  // Two RAF ticks for overlay positioning + inner WC updates.
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
}

async function mount(setup?: (el: MpDatetimePickerElement) => void): Promise<MpDatetimePickerElement> {
  const el = document.createElement('mp-datetime-picker') as MpDatetimePickerElement;
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

function shadow(el: MpDatetimePickerElement): ShadowRoot {
  return el.shadowRoot!;
}

describe('mp-datetime-picker — shell', () => {
  let el: MpDatetimePickerElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('renders an input + date trigger + time trigger', () => {
    expect(shadow(el).querySelector('input.form-control')).not.toBeNull();
    expect(shadow(el).querySelector('button.trigger.date')).not.toBeNull();
    expect(shadow(el).querySelector('button.trigger.time')).not.toBeNull();
  });

  it('both triggers have aria-haspopup="dialog" (each popup wraps its own widget)', () => {
    expect(shadow(el).querySelector('button.date')!.getAttribute('aria-haspopup')).toBe('dialog');
    expect(shadow(el).querySelector('button.time')!.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('input renders the localized datetime when value is set', async () => {
    el.value = new Date(2026, 4, 14, 9, 30);
    el.locale = 'en-US';
    await flush(el);
    const input = shadow(el).querySelector('input') as HTMLInputElement;
    expect(input.value).toContain('14');
    expect(input.value).toContain('9:30');
  });

  it('disabled state gates triggers and the input', async () => {
    el.disabled = true;
    await flush(el);
    expect((shadow(el).querySelector('input') as HTMLInputElement).disabled).toBe(true);
    expect((shadow(el).querySelector('button.date') as HTMLButtonElement).disabled).toBe(true);
    expect((shadow(el).querySelector('button.time') as HTMLButtonElement).disabled).toBe(true);
  });

  it('clear button only renders when showClear=true AND value present', async () => {
    expect(shadow(el).querySelector('button.clear')).toBeNull();
    el.showClear = true;
    await flush(el);
    expect(shadow(el).querySelector('button.clear')).toBeNull();
    el.value = new Date(2026, 4, 14, 9, 30);
    await flush(el);
    expect(shadow(el).querySelector('button.clear')).not.toBeNull();
  });

  it('clicking clear fires value-change with null and clears value', async () => {
    el.value = new Date(2026, 4, 14, 9, 30);
    el.showClear = true;
    await flush(el);
    const events: (Date | null)[] = [];
    el.addEventListener('value-change', (e) =>
      events.push((e as CustomEvent<Date | null>).detail),
    );
    (shadow(el).querySelector('button.clear') as HTMLButtonElement).click();
    await flush(el);
    expect(events).toEqual([null]);
    expect(el.value).toBeNull();
  });
});

describe('mp-datetime-picker — popups (Phase 6)', () => {
  let el: MpDatetimePickerElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('clicking the date trigger opens the date popup; aria-expanded flips', async () => {
    (shadow(el).querySelector('button.date') as HTMLButtonElement).click();
    await flush(el);
    expect(el.openPopup).toBe('date');
    expect(shadow(el).querySelector('button.date')!.getAttribute('aria-expanded')).toBe('true');
    expect(el.getAttribute('data-open')).toBe('date');
  });

  it('clicking the time trigger opens the time popup', async () => {
    (shadow(el).querySelector('button.time') as HTMLButtonElement).click();
    await flush(el);
    expect(el.openPopup).toBe('time');
    expect(shadow(el).querySelector('button.time')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('mutual exclusion — opening time closes date', async () => {
    await el.openDate();
    await flush(el);
    expect(el.openPopup).toBe('date');
    await el.openTime();
    await flush(el);
    expect(el.openPopup).toBe('time');
  });

  it('clicking the open trigger again closes the popup', async () => {
    (shadow(el).querySelector('button.date') as HTMLButtonElement).click();
    await flush(el);
    expect(el.openPopup).toBe('date');
    (shadow(el).querySelector('button.date') as HTMLButtonElement).click();
    await flush(el);
    expect(el.openPopup).toBeNull();
  });

  it('selecting a date from the inner calendar updates value (keeps time)', async () => {
    el.value = new Date(2026, 4, 14, 9, 30);
    await flush(el);
    const events: (Date | null)[] = [];
    el.addEventListener('value-change', (e) =>
      events.push((e as CustomEvent<Date | null>).detail),
    );
    // Simulate selected-date-change from the calendar primitive.
    const calendar = shadow(el).querySelector('mp-calendar');
    calendar!.dispatchEvent(
      new CustomEvent<Date>('selected-date-change', {
        detail: new Date(2026, 4, 20),
        bubbles: true,
        composed: true,
      }),
    );
    await flush(el);
    expect(events.length).toBe(1);
    expect(el.value!.getDate()).toBe(20);
    // Time preserved
    expect(el.value!.getHours()).toBe(9);
    expect(el.value!.getMinutes()).toBe(30);
  });

  it('selecting a time from the inner list updates value (keeps date)', async () => {
    el.value = new Date(2026, 4, 14, 9, 30);
    await flush(el);
    await el.openTime();
    await flush(el);
    const list = shadow(el).querySelector('mp-time-list');
    const newTime = new Date();
    newTime.setHours(15, 45, 0, 0);
    list!.dispatchEvent(
      new CustomEvent<Date>('selected-time-change', {
        detail: newTime,
        bubbles: true,
        composed: true,
      }),
    );
    await flush(el);
    expect(el.value!.getHours()).toBe(15);
    expect(el.value!.getMinutes()).toBe(45);
    expect(el.value!.getDate()).toBe(14);
    // Selecting time closes the time popup.
    expect(el.openPopup).toBeNull();
  });

  it('first-time date selection applies defaultTime', async () => {
    el.defaultTime = { hour: 8, minute: 30 };
    await flush(el);
    const calendar = shadow(el).querySelector('mp-calendar');
    calendar!.dispatchEvent(
      new CustomEvent<Date>('selected-date-change', {
        detail: new Date(2026, 4, 14),
        bubbles: true,
        composed: true,
      }),
    );
    await flush(el);
    expect(el.value!.getHours()).toBe(8);
    expect(el.value!.getMinutes()).toBe(30);
  });

  it('Today button selects today (preserving existing time if any)', async () => {
    el.value = new Date(2020, 0, 1, 14, 15);
    await flush(el);
    await el.openDate();
    await flush(el);
    const todayBtn = shadow(el).querySelector('.popup-date .popup-footer button') as HTMLButtonElement;
    expect(todayBtn).not.toBeNull();
    todayBtn.click();
    await flush(el);
    const today = new Date();
    expect(el.value!.getFullYear()).toBe(today.getFullYear());
    expect(el.value!.getMonth()).toBe(today.getMonth());
    expect(el.value!.getDate()).toBe(today.getDate());
    expect(el.value!.getHours()).toBe(14);
    expect(el.value!.getMinutes()).toBe(15);
  });

  it('Now button selects current time rounded to step', async () => {
    el.value = new Date(2026, 4, 14, 0, 0);
    el.step = 15;
    await flush(el);
    await el.openTime();
    await flush(el);
    const nowBtn = shadow(el).querySelector('.popup-time .popup-footer button') as HTMLButtonElement;
    nowBtn.click();
    await flush(el);
    const now = new Date();
    const rounded = Math.floor(now.getMinutes() / 15) * 15;
    expect(el.value!.getHours()).toBe(now.getHours());
    expect(el.value!.getMinutes()).toBe(rounded);
    expect(el.value!.getDate()).toBe(14);
  });
});

/**
 * D12.15 #1/#2 — this element forwards `min`/`max` to its calendar but used to
 * forward NOTHING to its time list, alone among the three pickers. The fix is
 * not a verbatim forward: `mp-time-list` compares time-of-day only, so the
 * bound has to be derived per day.
 */
describe('mp-datetime-picker — time-list bounds are derived per day', () => {
  let el: MpDatetimePickerElement;
  afterEach(() => el?.remove());

  const timeList = () =>
    shadow(el).querySelector<HTMLElement & {
      minMinutes: number | null;
      maxMinutes: number | null;
    }>('mp-time-list')!;

  it('a bound constrains the clock on its OWN day', async () => {
    el = await mount((host) => {
      host.min = new Date(2026, 0, 10, 8, 30);
      host.setValue(new Date(2026, 0, 10, 12, 0), false);
    });
    expect(timeList().minMinutes).toBe(8 * 60 + 30);
  });

  it('…and not on any other day', async () => {
    el = await mount((host) => {
      host.min = new Date(2026, 0, 10, 8, 30);
      // Editing a LATER day: the whole 24 hours are legal there.
      host.setValue(new Date(2026, 0, 11, 12, 0), false);
    });
    expect(timeList().minMinutes).toBeNull();
  });

  /**
   * The regression guard for the naive fix. A date-only `max` is MIDNIGHT, so
   * forwarding it verbatim disables every slot but 00:00 — on every day of the
   * year, including days nowhere near the bound. The shipped ng demo used
   * exactly this shape, and no spec or e2e would have caught it.
   */
  it('a date-only max does not collapse every other day to 00:00', async () => {
    el = await mount((host) => {
      host.max = new Date(2026, 11, 31); // midnight
      host.setValue(new Date(2026, 5, 15, 14, 0), false);
    });
    expect(timeList().maxMinutes).toBeNull();
  });

  it('with no value yet, the bound follows TODAY — the day a pick would land on', async () => {
    const today = new Date();
    el = await mount((host) => {
      host.min = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0);
    });
    expect(timeList().minMinutes).toBe(9 * 60);
  });
});

/** D12.15 #3 — the footer buttons escaped every bound the grid below enforced. */
describe('mp-datetime-picker — Today / Now respect the bounds', () => {
  let el: MpDatetimePickerElement;
  afterEach(() => el?.remove());

  const footerButton = (popup: 'date' | 'time') =>
    shadow(el).querySelector<HTMLButtonElement>(`.popup-${popup} .popup-footer button`)!;

  it('Today is disabled when today falls outside min/max', async () => {
    el = await mount((host) => {
      host.min = new Date(2099, 0, 1);
    });
    expect(footerButton('date').disabled).toBe(true);
  });

  it('Today is enabled when today is in range', async () => {
    el = await mount((host) => {
      host.min = new Date(2000, 0, 1);
      host.max = new Date(2099, 0, 1);
    });
    expect(footerButton('date').disabled).toBe(false);
  });

  it('Now is disabled when the current time is outside the day’s derived range', async () => {
    const today = new Date();
    el = await mount((host) => {
      // A min later today than "now" can possibly be.
      host.min = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59);
    });
    expect(footerButton('time').disabled).toBe(true);
  });

  it('a disabled Today writes nothing when clicked anyway', async () => {
    el = await mount((host) => {
      host.min = new Date(2099, 0, 1);
    });
    footerButton('date').click();
    await flush(el);
    expect(el.value).toBeNull();
  });
});
