import { afterEach, describe, expect, it } from 'vitest';
import './mp-datetime-picker.element';
import type { MpDatetimePickerElement } from './mp-datetime-picker.element';
import '@mintplayer/web-components/calendar';
import '@mintplayer/web-components/timepicker';
import type { MpCalendarElement } from '@mintplayer/web-components/calendar';

async function flush(el: MpDatetimePickerElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(): Promise<MpDatetimePickerElement> {
  const el = document.createElement('mp-datetime-picker') as MpDatetimePickerElement;
  el.value = new Date(2026, 4, 14, 9, 30);
  el.step = 30;
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const calendar = (el: MpDatetimePickerElement) => el.shadowRoot!.querySelector('mp-calendar') as MpCalendarElement;
const cell = (el: MpDatetimePickerElement, d: number) =>
  calendar(el).shadowRoot!.querySelector(`[id$="-cell-2026-4-${d}"]`) as HTMLElement;
const timeOptions = (el: MpDatetimePickerElement) =>
  Array.from(el.shadowRoot!.querySelector('mp-time-list')!.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]'));

/**
 * The inner calendar and time list emit composed events. The picker consumes
 * them and reports through value-change only; they must not escape the host,
 * and each pick must be handled once.
 */
describe('mp-datetime-picker inner events', () => {
  let el: MpDatetimePickerElement;
  afterEach(() => el.remove());

  it('a date pick emits one value-change and no calendar events from the host', async () => {
    el = await mount();
    await el.openDate();
    await flush(el);
    const seen: string[] = [];
    ['value-change', 'selected-date-change', 'current-month-change'].map((type) =>
      el.addEventListener(type, () => seen.push(type)),
    );

    cell(el, 20).click();

    expect(seen).toEqual(['value-change']);
    expect(el.value).toEqual(new Date(2026, 4, 20, 9, 30));
  });

  it('a month step does not escape the host', async () => {
    el = await mount();
    await el.openDate();
    await flush(el);
    const seen: string[] = [];
    el.addEventListener('current-month-change', () => seen.push('current-month-change'));
    (calendar(el).shadowRoot!.querySelectorAll('button')[1] as HTMLButtonElement).click();
    expect(seen).toEqual([]);
  });

  it('a time pick emits one value-change and no time-list event from the host', async () => {
    el = await mount();
    await el.openTime();
    await flush(el);
    const seen: string[] = [];
    ['value-change', 'selected-time-change'].map((type) => el.addEventListener(type, () => seen.push(type)));

    // At a 30-minute step, option 21 is 10:30.
    timeOptions(el)[21].click();

    expect(seen).toEqual(['value-change']);
    expect(el.value).toEqual(new Date(2026, 4, 14, 10, 30));
    expect(el.openPopup).toBeNull();
  });

  it('picking a new day closes the date popup (the behaviour as shipped)', async () => {
    el = await mount();
    await el.openDate();
    await flush(el);
    cell(el, 20).click();
    await flush(el);
    expect(el.openPopup).toBeNull();
  });

  it('re-picking the selected day closes the date popup without a value-change', async () => {
    el = await mount();
    await el.openDate();
    await flush(el);
    const changes: unknown[] = [];
    el.addEventListener('value-change', (e) => changes.push(e));
    cell(el, 14).click();
    await flush(el);
    expect(el.openPopup).toBeNull();
    expect(changes).toEqual([]);
  });
});
