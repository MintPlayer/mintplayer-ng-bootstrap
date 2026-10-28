import { afterEach, describe, expect, it } from 'vitest';
import { formatPickedDate } from '@mintplayer/ui-core/datepicker';
import { MpDatepicker } from './generated';

void MpDatepicker; // force the side-effect registration

/**
 * The Lit date picker front (#437): light DOM, rendered from the template
 * compiled out of `@mintplayer/ui-core/datepicker`. The core's spec covers the
 * bags; this file pins the element: hydration turns the native date field into
 * a display, and a picked day reaches the field, the hidden input and the event.
 */

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function settle(el: MpDatepicker): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
  await frame();
}

async function mount(setup: (el: MpDatepicker) => void = () => undefined): Promise<MpDatepicker> {
  const el = document.createElement('mp-datepicker') as MpDatepicker;
  el.selectedDate = new Date(2026, 4, 13);
  el.locale = 'en-US';
  setup(el);
  document.body.append(el);
  await settle(el);
  return el;
}

const field = (el: MpDatepicker) => el.querySelector('input.datepicker-input') as HTMLInputElement;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-datepicker', () => {
  it('shows the picked day in a readonly display once hydrated', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(field(el).type).toBe('text');
    expect(field(el).readOnly).toBe(true);
    expect(field(el).value).toBe(formatPickedDate(new Date(2026, 4, 13), 'en-US'));
    const trigger = el.querySelector('.datepicker-trigger') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-controls')).toBe(el.querySelector('[role=dialog]')?.id);
  });

  it('submits the ISO date through a hidden input when named', async () => {
    const el = await mount((e) => (e.name = 'birthday'));
    const hidden = el.querySelector('input[type=hidden]') as HTMLInputElement;
    expect(hidden.name).toBe('birthday');
    expect(hidden.value).toBe('2026-05-13');
    expect(field(el).name).toBe('');
  });

  it('picks a day from the grid: field, hidden input and event follow', async () => {
    const el = await mount((e) => (e.name = 'birthday'));
    const seen: Date[] = [];
    el.addEventListener('selecteddatechange', (e) => seen.push((e as CustomEvent<Date>).detail));
    (el.querySelector('[data-date="2026-05-21"]') as HTMLElement).click();
    await settle(el);
    expect(seen.map((d) => d.getDate())).toEqual([21]);
    expect(el.selectedDate?.getDate()).toBe(21);
    expect(field(el).value).toBe(formatPickedDate(new Date(2026, 4, 21), 'en-US'));
    expect((el.querySelector('input[type=hidden]') as HTMLInputElement).value).toBe('2026-05-21');
    expect(el.querySelector('[data-date="2026-05-21"]')?.getAttribute('aria-selected')).toBe('true');
  });

  it('refuses a disabled day', async () => {
    const el = await mount((e) => (e.disableDateFn = (d) => d.getDate() === 21));
    (el.querySelector('[data-date="2026-05-21"]') as HTMLElement).click();
    await settle(el);
    expect(el.selectedDate?.getDate()).toBe(13);
  });

  it('follows a selectedDate written from outside', async () => {
    const el = await mount();
    el.selectedDate = new Date(2026, 6, 4);
    await settle(el);
    expect(field(el).value).toBe(formatPickedDate(new Date(2026, 6, 4), 'en-US'));
    expect(el.querySelector('[data-date="2026-07-04"]')?.getAttribute('aria-selected')).toBe('true');
  });

  it('disables the field and the trigger', async () => {
    const el = await mount((e) => (e.disabled = true));
    expect(field(el).disabled).toBe(true);
    expect((el.querySelector('.datepicker-trigger') as HTMLButtonElement).disabled).toBe(true);
  });
});
