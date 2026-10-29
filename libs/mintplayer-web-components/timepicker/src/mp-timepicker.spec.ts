import { afterEach, describe, expect, it } from 'vitest';
import { MpTimeList, MpTimepicker } from './generated';

void MpTimeList; // force the side-effect registrations
void MpTimepicker;

/**
 * The Lit time list and time picker fronts (#437): light DOM, rendered from
 * the templates compiled out of `@mintplayer/ui-core/timepicker`. The core's
 * spec covers the slots, the keymap and the bags; this file pins the elements.
 */

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function settle(el: HTMLElement & { updateComplete: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
  await frame();
}

const key = (target: HTMLElement, k: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const roving = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-minutes][tabindex="0"]')?.dataset['minutes'];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-time-list', () => {
  async function mount(setup: (el: MpTimeList) => void = () => undefined): Promise<MpTimeList> {
    const el = document.createElement('mp-time-list') as MpTimeList;
    el.selectedTime = new Date(2026, 4, 13, 10, 0);
    el.step = 15;
    setup(el);
    document.body.append(el);
    await settle(el);
    return el;
  }

  it('is a named listbox host in the light DOM, the selected slot holding the tab stop', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.getAttribute('role')).toBe('listbox');
    expect(el.getAttribute('aria-label')).toBe('Select time');
    expect(roving(el)).toBe('600');
  });

  it('moves focus with the keymap', async () => {
    const el = await mount();
    const start = el.querySelector('[data-minutes="600"]') as HTMLElement;
    start.focus();
    key(start, 'ArrowDown');
    await settle(el);
    expect(document.activeElement?.getAttribute('data-minutes')).toBe('615');
    key(document.activeElement as HTMLElement, 'PageDown');
    await settle(el);
    expect(document.activeElement?.getAttribute('data-minutes')).toBe('675');
    expect(roving(el)).toBe('675');
  });

  it('selects on click, keeping the date, and refuses an out-of-range slot', async () => {
    const el = await mount((e) => (e.maxMinutes = 12 * 60));
    const seen: Date[] = [];
    el.addEventListener('selectedtimechange', (e) => seen.push((e as CustomEvent<Date>).detail));
    (el.querySelector('[data-minutes="690"]') as HTMLElement).click();
    (el.querySelector('[data-minutes="900"]') as HTMLElement).click();
    await settle(el);
    expect(seen.map((d) => [d.getDate(), d.getHours(), d.getMinutes()])).toEqual([[13, 11, 30]]);
    expect(el.querySelector('[data-minutes="690"]')?.getAttribute('aria-selected')).toBe('true');
  });
});

describe('mp-timepicker', () => {
  async function mount(setup: (el: MpTimepicker) => void = () => undefined): Promise<MpTimepicker> {
    const el = document.createElement('mp-timepicker') as MpTimepicker;
    el.selectedTime = new Date(2026, 4, 13, 9, 30);
    el.locale = 'en-GB';
    setup(el);
    document.body.append(el);
    await settle(el);
    return el;
  }
  const field = (el: MpTimepicker) => el.querySelector('input.timepicker-input') as HTMLInputElement;

  it('shows the time in a readonly display once hydrated, with a hidden HH:MM input', async () => {
    const el = await mount((e) => (e.name = 'start'));
    expect(field(el).type).toBe('text');
    expect(field(el).readOnly).toBe(true);
    expect(field(el).value).toBe('09:30');
    expect((el.querySelector('input[type=hidden]') as HTMLInputElement).value).toBe('09:30');
    expect(el.querySelector('.timepicker-trigger')?.getAttribute('aria-controls')).toBe(el.querySelector('[role=listbox]')?.id);
  });

  it('picks a slot: field, hidden input and event follow', async () => {
    const el = await mount((e) => (e.name = 'start'));
    const seen: Date[] = [];
    el.addEventListener('selectedtimechange', (e) => seen.push((e as CustomEvent<Date>).detail));
    (el.querySelector('[data-minutes="615"]') as HTMLElement).click();
    await settle(el);
    expect(seen.map((d) => d.getHours() * 60 + d.getMinutes())).toEqual([615]);
    expect(field(el).value).toBe('10:15');
    expect((el.querySelector('input[type=hidden]') as HTMLInputElement).value).toBe('10:15');
  });

  it('refuses a slot outside min and max (time of day only)', async () => {
    const el = await mount((e) => (e.min = new Date(2020, 0, 1, 9, 0)));
    (el.querySelector('[data-minutes="480"]') as HTMLElement).click();
    await settle(el);
    expect(el.selectedTime?.getHours()).toBe(9);
    expect(el.querySelector('[data-minutes="480"]')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('disables the field and the trigger', async () => {
    const el = await mount((e) => (e.disabled = true));
    expect(field(el).disabled).toBe(true);
    expect((el.querySelector('.timepicker-trigger') as HTMLButtonElement).disabled).toBe(true);
  });
});
