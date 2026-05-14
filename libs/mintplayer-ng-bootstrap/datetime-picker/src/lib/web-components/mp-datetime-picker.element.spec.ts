import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-datetime-picker.element';
import type { MpDatetimePickerElement } from './mp-datetime-picker.element';
import '@mintplayer/ng-bootstrap/calendar';
import '@mintplayer/ng-bootstrap/timepicker';

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

  it('date trigger has aria-haspopup="dialog"; time trigger has aria-haspopup="listbox"', () => {
    expect(shadow(el).querySelector('button.date')!.getAttribute('aria-haspopup')).toBe('dialog');
    expect(shadow(el).querySelector('button.time')!.getAttribute('aria-haspopup')).toBe('listbox');
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
