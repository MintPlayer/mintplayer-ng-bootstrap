import {
  connectTimeList,
  connectTimepicker,
  formatTime,
  parseIsoTime,
  resolveHour12,
  resolveTimeStep,
  rovingSlot,
  timeListKeyTarget,
  timeSlots,
  withTimeOfDay,
  type TimeListOptions,
  type TimepickerOptions,
} from './timepicker';

describe('time slots', () => {
  it('divides the day by the step, falling back on an unusable one', () => {
    expect(timeSlots(15)).toHaveLength(96);
    expect(timeSlots(60)).toHaveLength(24);
    expect(resolveTimeStep(null)).toBe(15);
    expect(resolveTimeStep(Number.NaN)).toBe(15);
    expect(resolveTimeStep(0)).toBe(15);
  });

  it('reads the hour12 attribute forms', () => {
    expect(resolveHour12('')).toBe(true);
    expect(resolveHour12('true')).toBe(true);
    expect(resolveHour12('false')).toBe(false);
    expect(resolveHour12('auto')).toBeUndefined();
  });

  it('parses HH:MM and HH:MM:SS, and rejects the rest', () => {
    expect(parseIsoTime('08:30')).toBe(510);
    expect(parseIsoTime('23:59:00')).toBe(1439);
    expect(parseIsoTime('24:00')).toBeNull();
    expect(parseIsoTime('')).toBeNull();
  });

  it('keeps the carrier day when setting a time', () => {
    const time = withTimeOfDay(new Date(2026, 4, 13, 9, 0), 18 * 60 + 15);
    expect([time.getDate(), time.getHours(), time.getMinutes()]).toEqual([13, 18, 15]);
  });

  it('formats with the requested clock', () => {
    expect(formatTime(13 * 60 + 5, 'en-US', true)).toMatch(/01:05\s?PM/);
    expect(formatTime(13 * 60 + 5, 'en-US', false)).toBe('13:05');
  });
});

describe('time list keymap', () => {
  it('moves one slot, to the ends, and one hour', () => {
    expect(timeListKeyTarget('ArrowDown', 60, 15)).toBe(75);
    expect(timeListKeyTarget('ArrowUp', 60, 15)).toBe(45);
    expect(timeListKeyTarget('ArrowUp', 0, 15)).toBe(0);
    expect(timeListKeyTarget('Home', 600, 15)).toBe(0);
    expect(timeListKeyTarget('End', 0, 15)).toBe(1425);
    expect(timeListKeyTarget('PageDown', 600, 15)).toBe(660);
    expect(timeListKeyTarget('PageUp', 30, 15)).toBe(0);
    expect(timeListKeyTarget('PageDown', 1400, 15)).toBe(1425);
    expect(timeListKeyTarget('a', 0, 15)).toBeNull();
  });

  it('puts the tab stop on the focused, else the selected snap, else the first slot', () => {
    expect(rovingSlot({ focused: 90, selected: 600, step: 15 })).toBe(90);
    expect(rovingSlot({ focused: null, selected: 607, step: 15 })).toBe(600);
    expect(rovingSlot({ focused: null, selected: null, step: 15 })).toBe(0);
  });
});

const listBase: TimeListOptions = {
  id: 'tl',
  selected: 600,
  focused: null,
  step: 60,
  minMinutes: 480,
  maxMinutes: 1080,
  locale: 'en-GB',
  hour12: 'auto',
  hydrated: true,
  label: null,
};

describe('connectTimeList', () => {
  it('renders a named listbox of options with one roving slot', () => {
    const view = connectTimeList(listBase);
    expect(view.root).toMatchObject({ role: 'listbox', 'aria-label': 'Select time' });
    expect(view.slots).toHaveLength(24);
    const tabbable = view.slots.filter((s) => s.option['tabindex'] === 0);
    expect(tabbable.map((s) => s.key)).toEqual(['600']);
    expect(view.slots[10].option).toMatchObject({ role: 'option', 'aria-selected': 'true', id: 'tl-slot-600' });
  });

  it('marks out-of-range slots aria-disabled but keeps them focusable', () => {
    const view = connectTimeList(listBase);
    expect(view.slots[7].option['aria-disabled']).toBe('true');
    expect(view.slots[7].option['tabindex']).toBe(-1);
    expect(view.slots[8].option['aria-disabled']).toBeNull();
  });

  it('renders inert before hydration', () => {
    const view = connectTimeList({ ...listBase, hydrated: false });
    expect(view.slots.every((s) => s.option['disabled'] === true && s.option['tabindex'] === null)).toBe(true);
  });

  it('takes the consumer label', () => {
    expect(connectTimeList({ ...listBase, label: 'Start' }).root['aria-label']).toBe('Start');
  });
});

const pickerBase: TimepickerOptions = {
  id: 'tp',
  selected: 9 * 60 + 30,
  focused: null,
  open: false,
  step: 15,
  minMinutes: 8 * 60,
  maxMinutes: null,
  locale: 'en-GB',
  hour12: 'auto',
  disabled: false,
  placeholder: null,
  required: false,
  invalid: false,
  errorText: null,
  name: 'start',
  hydrated: true,
  label: null,
};

describe('connectTimepicker', () => {
  it('renders a native time field that submits HH:MM before hydration', () => {
    const view = connectTimepicker({ ...pickerBase, hydrated: false });
    expect(view.input).toMatchObject({ type: 'time', name: 'start', value: '09:30', min: '08:00', step: 900 });
    expect(view.hidden).toBeNull();
    expect(view.trigger).toBeNull();
  });

  it('turns into a readonly display, a hidden input and a trigger once hydrated', () => {
    const view = connectTimepicker(pickerBase);
    expect(view.input).toMatchObject({ type: 'text', readonly: true, name: null, value: '09:30', 'aria-label': 'Selected time' });
    expect(view.hidden).toMatchObject({ type: 'hidden', name: 'start', value: '09:30' });
    expect(view.trigger).toMatchObject({
      popovertarget: 'tp-popup',
      'aria-controls': 'tp-list',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-label': 'Choose time',
    });
    expect(view.timeList.root['id']).toBe('tp-list');
  });

  it('names the field from the consumer label', () => {
    expect(connectTimepicker({ ...pickerBase, label: 'Start' }).input['aria-label']).toBe('Start');
  });
});
