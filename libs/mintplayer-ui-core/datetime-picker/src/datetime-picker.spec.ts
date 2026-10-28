import {
  connectDatetimePicker,
  isoDateTime,
  parseIsoDateTime,
  roundedNow,
  timeBoundsOn,
  type DatetimePickerOptions,
} from './datetime-picker';

describe('datetime helpers', () => {
  it('round-trips the datetime-local form', () => {
    const value = new Date(2026, 4, 13, 9, 5);
    expect(isoDateTime(value)).toBe('2026-05-13T09:05');
    expect(parseIsoDateTime('2026-05-13T09:05')?.getTime()).toBe(value.getTime());
    expect(parseIsoDateTime('2026-05-13T09:05:30')?.getTime()).toBe(value.getTime());
  });

  it('rejects what is not a datetime', () => {
    expect(parseIsoDateTime('')).toBeNull();
    expect(parseIsoDateTime(null)).toBeNull();
    expect(parseIsoDateTime('2026-05-13')).toBeNull();
    expect(parseIsoDateTime('2026-02-30T10:00')).toBeNull();
  });

  it('bounds the time list only on the bound’s own day', () => {
    const min = new Date(2026, 0, 1, 9, 0);
    const max = new Date(2026, 11, 31, 17, 30);
    expect(timeBoundsOn(new Date(2026, 0, 1), min, max)).toEqual({ minMinutes: 540, maxMinutes: null });
    expect(timeBoundsOn(new Date(2026, 11, 31), min, max)).toEqual({ minMinutes: null, maxMinutes: 1050 });
    expect(timeBoundsOn(new Date(2026, 5, 1), min, max)).toEqual({ minMinutes: null, maxMinutes: null });
  });

  it('snaps now down to the step', () => {
    const now = roundedNow(new Date(2026, 4, 13, 9, 44, 31), 15);
    expect([now.getHours(), now.getMinutes(), now.getSeconds()]).toEqual([9, 30, 0]);
  });
});

describe('connectDatetimePicker', () => {
  const base: DatetimePickerOptions = {
    id: 'dt',
    value: new Date(2026, 4, 13, 9, 30),
    month: new Date(2026, 4, 1),
    focusedDate: null,
    focusedMinutes: null,
    now: new Date(2026, 4, 13, 12, 0),
    open: null,
    firstDayOfWeek: 1,
    locale: 'en-GB',
    hour12: false,
    step: 15,
    min: null,
    max: null,
    disableDateFn: null,
    placeholder: null,
    showClear: true,
    disabled: false,
    required: false,
    invalid: false,
    errorText: null,
    name: 'start',
    hydrated: true,
    label: null,
    announcement: '',
  };

  it('is a native datetime-local field before hydration, carrying name and limits', () => {
    const view = connectDatetimePicker({
      ...base,
      hydrated: false,
      min: new Date(2026, 0, 1, 8, 0),
      max: new Date(2026, 11, 31, 18, 0),
    });
    expect(view.input).toMatchObject({
      type: 'datetime-local',
      name: 'start',
      value: '2026-05-13T09:30',
      min: '2026-01-01T08:00',
      max: '2026-12-31T18:00',
      step: 900,
      readonly: false,
    });
    expect(view.hidden).toBeNull();
    expect(view.clear).toBeNull();
    expect(view.dateTrigger).toBeNull();
    expect(view.timeTrigger).toBeNull();
  });

  it('is a readonly display with a hidden ISO input and popover triggers once hydrated', () => {
    const view = connectDatetimePicker({ ...base, open: 'date' });
    expect(view.input).toMatchObject({ type: 'text', readonly: true, name: null, 'aria-label': 'Selected date and time' });
    expect(view.hidden).toMatchObject({ type: 'hidden', name: 'start', value: '2026-05-13T09:30' });
    expect(view.dateTrigger).toMatchObject({ popovertarget: 'dt-popup-date', 'aria-expanded': 'true', 'aria-label': 'Choose date' });
    expect(view.timeTrigger).toMatchObject({ popovertarget: 'dt-popup-time', 'aria-expanded': 'false', 'aria-label': 'Choose time' });
    expect(view.datePopup).toMatchObject({ id: 'dt-popup-date', popover: 'auto', role: 'dialog' });
    expect(view.timePopup).toMatchObject({ id: 'dt-popup-time', popover: 'auto', role: 'dialog' });
    expect(view.clear).toMatchObject({ 'aria-label': 'Clear' });
  });

  it('hides clear without a value and disables every control when disabled', () => {
    expect(connectDatetimePicker({ ...base, value: null }).clear).toBeNull();
    const view = connectDatetimePicker({ ...base, disabled: true });
    expect(view.clear).toBeNull();
    expect(view.input['disabled']).toBe(true);
    expect(view.dateTrigger?.['disabled']).toBe(true);
    expect(view.timeTrigger?.['disabled']).toBe(true);
  });

  it('describes an invalid field with its error text', () => {
    const view = connectDatetimePicker({ ...base, invalid: true, errorText: 'Too late', required: true });
    expect(view.showFeedback).toBe(true);
    expect(view.feedback.text).toBe('Too late');
    expect(view.input).toMatchObject({ 'aria-invalid': 'true', required: true, 'aria-required': 'true' });
    expect(String(view.input['aria-describedby'])).toContain(String(view.feedback.attrs['id']));
  });

  it('narrows the slot list on the bound’s own day and greys out an unavailable Now', () => {
    const view = connectDatetimePicker({ ...base, min: new Date(2026, 4, 13, 13, 0) });
    const nine = view.timeList.slots.find((slot) => slot.option['data-minutes'] === 540);
    expect(nine?.option['aria-disabled']).toBe('true');
    expect(view.now['disabled']).toBe(true);
  });

  it('announces through a polite status region', () => {
    const view = connectDatetimePicker({ ...base, announcement: 'Cleared' });
    expect(view.live).toMatchObject({ role: 'status', 'aria-live': 'polite' });
    expect(view.liveText).toBe('Cleared');
  });
});
