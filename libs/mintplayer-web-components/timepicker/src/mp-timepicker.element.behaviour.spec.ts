import { afterEach, describe, expect, it } from 'vitest';
import './mp-timepicker.element';
import type { MpTimepickerElement } from './mp-timepicker.element';

async function flush(el: MpTimepickerElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(setup?: (el: MpTimepickerElement) => void): Promise<MpTimepickerElement> {
  const el = document.createElement('mp-timepicker') as MpTimepickerElement;
  el.selectedTime = new Date(2026, 4, 15, 9, 30);
  el.step = 30;
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const trigger = (el: MpTimepickerElement) => el.shadowRoot!.querySelector('button.trigger') as HTMLButtonElement;
const display = (el: MpTimepickerElement) => el.shadowRoot!.querySelector('input') as HTMLInputElement;
const options = (el: MpTimepickerElement) =>
  Array.from(el.shadowRoot!.querySelector('mp-time-list')!.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]'));

describe('mp-timepicker picking a time', () => {
  let el: MpTimepickerElement;
  afterEach(() => el.remove());

  it('emits exactly one selected-time-change per pick, from the host', async () => {
    el = await mount();
    await el.open();
    await flush(el);
    const events: CustomEvent<Date>[] = [];
    el.addEventListener('selected-time-change', (e) => events.push(e as CustomEvent<Date>));

    // Slot 21 at a 30-minute step is 10:30.
    options(el)[21].click();

    expect(events).toHaveLength(1);
    expect(events[0].detail.getHours()).toBe(10);
    expect(events[0].detail.getMinutes()).toBe(30);
  });

  it('picking a time stores it, closes the popup and updates the display', async () => {
    el = await mount((host) => (host.locale = 'en-GB'));
    await el.open();
    await flush(el);
    options(el)[21].click();
    await flush(el);
    expect(el.selectedTime?.getHours()).toBe(10);
    expect(el.isOpen).toBe(false);
    expect(display(el).value).toBe('10:30');
  });

  it('ignores a selected-time-change without a Date detail', async () => {
    el = await mount();
    const events: unknown[] = [];
    el.addEventListener('selected-time-change', (e) => events.push(e));
    el.shadowRoot!.querySelector('mp-time-list')!.dispatchEvent(
      new CustomEvent('selected-time-change', { detail: 'x', bubbles: true }),
    );
    expect(events).toHaveLength(0);
    expect(el.selectedTime?.getMinutes()).toBe(30);
  });
});

describe('mp-timepicker display format', () => {
  let el: MpTimepickerElement;
  afterEach(() => el.remove());

  it('hour12 forces a 12-hour clock, false forces 24-hour, unset follows the locale', async () => {
    el = await mount((host) => {
      host.locale = 'en-US';
      host.selectedTime = new Date(2026, 4, 15, 14, 5);
    });
    expect(display(el).value).toBe('02:05 PM');

    el.hour12 = false;
    await flush(el);
    expect(display(el).value).toBe('14:05');

    el.hour12 = true;
    el.locale = 'en-GB';
    await flush(el);
    expect(display(el).value).toMatch(/^02:05\s?pm$/i);
  });

  it('shows an empty display without a selected time', async () => {
    el = await mount((host) => (host.selectedTime = null));
    expect(display(el).value).toBe('');
  });
});

describe('mp-timepicker trigger', () => {
  let el: MpTimepickerElement;
  afterEach(() => el.remove());

  it.each(['ArrowDown', 'Enter', ' '])('opens on %j and swallows the key', async (key) => {
    el = await mount();
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    trigger(el).dispatchEvent(ev);
    await flush(el);
    expect(ev.defaultPrevented).toBe(true);
    expect(el.isOpen).toBe(true);
  });

  it('leaves other keys alone, and an opening key while open keeps it open', async () => {
    el = await mount();
    const other = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    trigger(el).dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
    await el.open();
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush(el);
    expect(el.isOpen).toBe(true);
  });

  it('does nothing while disabled', async () => {
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
});
