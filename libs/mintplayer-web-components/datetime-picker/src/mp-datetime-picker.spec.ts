import { afterEach, describe, expect, it } from 'vitest';
import { MpDatetimePicker } from './generated';

void MpDatetimePicker; // force the side-effect registration

/**
 * The Lit datetime picker front (#437): light DOM, rendered from the template
 * compiled out of `@mintplayer/ui-core/datetime-picker`. The core's spec
 * covers the bags and the helpers; this file pins the element.
 */

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function settle(el: MpDatetimePicker): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
  await frame();
}

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(setup: (el: MpDatetimePicker) => void = () => undefined): Promise<MpDatetimePicker> {
  const el = document.createElement('mp-datetime-picker') as MpDatetimePicker;
  el.value = new Date(2026, 4, 13, 9, 30);
  el.locale = 'en-GB';
  el.name = 'start';
  setup(el);
  document.body.append(el);
  await settle(el);
  return el;
}

const field = (el: MpDatetimePicker) => el.querySelector('input.datetime-picker-input') as HTMLInputElement;
const hidden = (el: MpDatetimePicker) => el.querySelector('input[type=hidden]') as HTMLInputElement;
const changes = (el: MpDatetimePicker) => {
  const seen: (Date | null)[] = [];
  el.addEventListener('valuechange', (e) => seen.push((e as CustomEvent<Date | null>).detail));
  return seen;
};

describe('mp-datetime-picker', () => {
  it('is a readonly display in the light DOM once hydrated, with a hidden ISO input', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(field(el).type).toBe('text');
    expect(field(el).readOnly).toBe(true);
    expect(field(el).value).not.toBe('');
    expect(hidden(el).name).toBe('start');
    expect(hidden(el).value).toBe('2026-05-13T09:30');
  });

  it('wires each trigger to its popover', async () => {
    const el = await mount();
    const date = el.querySelector('.datetime-picker-date') as HTMLButtonElement;
    const time = el.querySelector('.datetime-picker-time') as HTMLButtonElement;
    expect(date.getAttribute('popovertarget')).toBe(el.querySelector('.datetime-picker-popup-date')?.id);
    expect(time.getAttribute('popovertarget')).toBe(el.querySelector('.datetime-picker-popup-time')?.id);
    expect(date.getAttribute('aria-label')).toBe('Choose date');
    expect(time.getAttribute('aria-label')).toBe('Choose time');
  });

  it('picking a day keeps the time; picking a slot keeps the day', async () => {
    const el = await mount();
    const seen = changes(el);
    (el.querySelector('td[data-date="2026-05-20"]') as HTMLElement).click();
    await settle(el);
    (el.querySelector('[data-minutes="615"]') as HTMLElement).click();
    await settle(el);
    expect(seen.map((d) => d && [d.getDate(), d.getHours(), d.getMinutes()])).toEqual([
      [20, 9, 30],
      [20, 10, 15],
    ]);
    expect(el.value?.getTime()).toBe(new Date(2026, 4, 20, 10, 15).getTime());
    expect(hidden(el).value).toBe('2026-05-20T10:15');
    expect(el.querySelector('[role=status]')?.textContent).toContain('selected');
  });

  it('refuses a day outside min and max', async () => {
    const el = await mount((e) => (e.max = new Date(2026, 4, 15, 23, 59)));
    const seen = changes(el);
    const late = el.querySelector('td[data-date="2026-05-20"]') as HTMLElement;
    expect(late.getAttribute('aria-disabled')).toBe('true');
    late.click();
    await settle(el);
    expect(seen).toEqual([]);
  });

  it('clears with the clear button', async () => {
    const el = await mount((e) => (e.showClear = true));
    const seen = changes(el);
    (el.querySelector('.datetime-picker-clear') as HTMLButtonElement).click();
    await settle(el);
    expect(seen).toEqual([null]);
    expect(field(el).value).toBe('');
    expect(hidden(el).value).toBe('');
  });

  it('follows a value written from outside, without an event', async () => {
    const el = await mount();
    const seen = changes(el);
    el.value = new Date(2027, 0, 2, 14, 0);
    await settle(el);
    expect(seen).toEqual([]);
    expect(hidden(el).value).toBe('2027-01-02T14:00');
    expect(el.querySelector('td[data-date="2027-01-02"]')).not.toBeNull();
  });

  it('disables the field and the triggers', async () => {
    const el = await mount((e) => (e.disabled = true));
    expect(field(el).disabled).toBe(true);
    expect((el.querySelector('.datetime-picker-date') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('.datetime-picker-time') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the error text as the field description', async () => {
    const el = await mount((e) => {
      e.invalid = true;
      e.errorText = 'End must be after start';
    });
    const feedback = el.querySelector('.invalid-feedback') as HTMLElement;
    expect(feedback.textContent).toBe('End must be after start');
    expect(field(el).getAttribute('aria-invalid')).toBe('true');
    expect(field(el).getAttribute('aria-describedby')).toContain(feedback.id);
  });
});
