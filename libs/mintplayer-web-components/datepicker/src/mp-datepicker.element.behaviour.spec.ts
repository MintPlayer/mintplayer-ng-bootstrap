import { afterEach, describe, expect, it } from 'vitest';
import './mp-datepicker.element';
import type { MpDatepickerElement } from './mp-datepicker.element';
import type { MpCalendarElement } from '@mintplayer/web-components/calendar';

async function flush(el: MpDatepickerElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(setup?: (el: MpDatepickerElement) => void): Promise<MpDatepickerElement> {
  const el = document.createElement('mp-datepicker') as MpDatepickerElement;
  el.selectedDate = new Date(2026, 4, 15);
  el.currentMonth = new Date(2026, 4, 1);
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const trigger = (el: MpDatepickerElement) => el.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
const display = (el: MpDatepickerElement) => el.shadowRoot!.querySelector('input') as HTMLInputElement;
const calendar = (el: MpDatepickerElement) => el.shadowRoot!.querySelector('mp-calendar') as MpCalendarElement;

function cell(cal: MpCalendarElement, y: number, m: number, d: number): HTMLElement {
  return cal.shadowRoot!.querySelector(`[id$="-cell-${y}-${m}-${d}"]`) as HTMLElement;
}

describe('mp-datepicker picking a date', () => {
  let el: MpDatepickerElement;
  afterEach(() => el.remove());

  it('emits exactly one selected-date-change per pick, from the host', async () => {
    el = await mount();
    await el.open();
    await flush(el);
    const events: CustomEvent<Date>[] = [];
    el.addEventListener('selected-date-change', (e) => events.push(e as CustomEvent<Date>));

    cell(calendar(el), 2026, 4, 20).click();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual(new Date(2026, 4, 20));
  });

  it('picking a date updates the display, closes the popup and stores the date', async () => {
    el = await mount((host) => (host.locale = 'en-US'));
    await el.open();
    await flush(el);
    cell(calendar(el), 2026, 4, 20).click();
    await flush(el);
    expect(el.selectedDate).toEqual(new Date(2026, 4, 20));
    expect(display(el).value).toBe('5/20/26');
    expect(el.isOpen).toBe(false);
  });

  it('emits exactly one current-month-change per month step', async () => {
    el = await mount();
    await el.open();
    await flush(el);
    const months: Date[] = [];
    el.addEventListener('current-month-change', (e) => months.push((e as CustomEvent<Date>).detail));

    const next = calendar(el).shadowRoot!.querySelectorAll('button')[1] as HTMLButtonElement;
    next.click();

    expect(months).toEqual([new Date(2026, 5, 1)]);
    expect(el.currentMonth).toEqual(new Date(2026, 5, 1));
  });

  it('ignores a selected-date-change without a Date detail', async () => {
    el = await mount();
    const events: unknown[] = [];
    el.addEventListener('selected-date-change', (e) => events.push(e));
    calendar(el).dispatchEvent(new CustomEvent('selected-date-change', { detail: 'x', bubbles: true }));
    calendar(el).dispatchEvent(new CustomEvent('current-month-change', { detail: 'x', bubbles: true }));
    expect(events).toHaveLength(0);
    expect(el.selectedDate).toEqual(new Date(2026, 4, 15));
    expect(el.currentMonth).toEqual(new Date(2026, 4, 1));
  });
});

describe('mp-datepicker trigger', () => {
  let el: MpDatepickerElement;
  afterEach(() => el.remove());

  it.each(['ArrowDown', 'Enter', ' '])('opens on %j and swallows the key', async (key) => {
    el = await mount();
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    trigger(el).dispatchEvent(ev);
    await flush(el);
    expect(ev.defaultPrevented).toBe(true);
    expect(el.isOpen).toBe(true);
  });

  it('leaves other keys alone', async () => {
    el = await mount();
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    trigger(el).dispatchEvent(ev);
    await flush(el);
    expect(ev.defaultPrevented).toBe(false);
    expect(el.isOpen).toBe(false);
  });

  it('a second opening key while open keeps it open', async () => {
    el = await mount();
    await el.open();
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush(el);
    expect(el.isOpen).toBe(true);
  });

  it('does nothing while disabled: no open from the key or from open()', async () => {
    el = await mount((host) => (host.disabled = true));
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await el.open();
    await flush(el);
    expect(el.isOpen).toBe(false);
  });

  it('emits opened and closed', async () => {
    el = await mount();
    const seen: string[] = [];
    el.addEventListener('opened', () => seen.push('opened'));
    el.addEventListener('closed', () => seen.push('closed'));
    await el.open();
    el.close(false);
    expect(seen).toEqual(['opened', 'closed']);
  });

  it('shows an empty display without a selected date', async () => {
    el = await mount((host) => (host.selectedDate = null));
    expect(display(el).value).toBe('');
  });
});
