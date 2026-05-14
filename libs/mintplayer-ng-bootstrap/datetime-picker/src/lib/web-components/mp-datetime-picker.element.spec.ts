import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-datetime-picker.element';
import type { MpDatetimePickerElement } from './mp-datetime-picker.element';

async function flush(el: MpDatetimePickerElement): Promise<void> {
  await el.updateComplete;
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

describe('mp-datetime-picker — Phase 5 shell', () => {
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

  it('input is empty when value is null', () => {
    const input = shadow(el).querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('input renders the localized datetime when value is set', async () => {
    el.value = new Date(2026, 4, 14, 9, 30);
    el.locale = 'en-US';
    await flush(el);
    const input = shadow(el).querySelector('input') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
    // en-US short style: "5/14/26, 9:30 AM" — day + time always present.
    expect(input.value).toContain('14');
    expect(input.value).toContain('9:30');
  });

  it('clicking the date trigger dispatches request-open with detail "date"', async () => {
    const events: string[] = [];
    el.addEventListener('request-open', (e) => events.push((e as CustomEvent<string>).detail));
    (shadow(el).querySelector('button.date') as HTMLButtonElement).click();
    await flush(el);
    expect(events).toEqual(['date']);
  });

  it('clicking the time trigger dispatches request-open with detail "time"', async () => {
    const events: string[] = [];
    el.addEventListener('request-open', (e) => events.push((e as CustomEvent<string>).detail));
    (shadow(el).querySelector('button.time') as HTMLButtonElement).click();
    await flush(el);
    expect(events).toEqual(['time']);
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

  it('setValue updates value and dispatches value-change', async () => {
    const events: (Date | null)[] = [];
    el.addEventListener('value-change', (e) =>
      events.push((e as CustomEvent<Date | null>).detail),
    );
    const t = new Date(2026, 4, 14, 12, 0);
    el.setValue(t);
    await flush(el);
    expect(events.length).toBe(1);
    expect(events[0]!.getDate()).toBe(14);
    expect(el.value!.getDate()).toBe(14);
  });
});
