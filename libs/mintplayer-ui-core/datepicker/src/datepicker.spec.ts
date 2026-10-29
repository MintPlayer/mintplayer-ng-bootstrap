import { connectDatepicker, datepickerPopupId, formatPickedDate, type DatepickerOptions } from './datepicker';

const base: DatepickerOptions = {
  id: 'dp',
  selected: new Date(2026, 4, 13),
  month: new Date(2026, 4, 1),
  focused: null,
  today: new Date(2026, 4, 20),
  open: false,
  firstDayOfWeek: 1,
  locale: 'en-US',
  min: new Date(2026, 0, 1),
  max: null,
  disableDateFn: null,
  disabled: false,
  placeholder: null,
  required: false,
  invalid: false,
  errorText: null,
  name: 'birthday',
  hydrated: true,
  label: null,
};

describe('connectDatepicker', () => {
  it('renders a native date field that submits the ISO date before hydration', () => {
    const view = connectDatepicker({ ...base, hydrated: false });
    expect(view.input['type']).toBe('date');
    expect(view.input['name']).toBe('birthday');
    expect(view.input['value']).toBe('2026-05-13');
    expect(view.input['min']).toBe('2026-01-01');
    expect(view.hidden).toBeNull();
    expect(view.trigger).toBeNull();
  });

  it('turns into a readonly display, a hidden input and a trigger once hydrated', () => {
    const view = connectDatepicker(base);
    expect(view.input['type']).toBe('text');
    expect(view.input['readonly']).toBe(true);
    expect(view.input['name']).toBeNull();
    expect(view.input['value']).toBe(formatPickedDate(base.selected, 'en-US'));
    expect(view.hidden).toMatchObject({ type: 'hidden', name: 'birthday', value: '2026-05-13' });
    expect(view.trigger).toMatchObject({
      popovertarget: datepickerPopupId('dp'),
      'aria-controls': datepickerPopupId('dp'),
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-label': 'Choose date',
    });
  });

  it('reflects the open state on the trigger', () => {
    expect(connectDatepicker({ ...base, open: true }).trigger?.['aria-expanded']).toBe('true');
  });

  it('names the field from the consumer label, else the default', () => {
    expect(connectDatepicker(base).input['aria-label']).toBe('Selected date');
    expect(connectDatepicker({ ...base, label: 'Birthday' }).input['aria-label']).toBe('Birthday');
  });

  it('renders the popup as a native auto popover dialog holding the grid', () => {
    const view = connectDatepicker(base);
    expect(view.popup).toMatchObject({ id: 'dp-popup', popover: 'auto', role: 'dialog' });
    expect(view.calendar.grid['role']).toBe('grid');
    expect(view.calendar.weeks.flatMap((w) => w.cells).some((c) => c.cell['aria-selected'] === 'true')).toBe(true);
  });

  it('disables the field and the trigger', () => {
    const view = connectDatepicker({ ...base, disabled: true });
    expect(view.input['disabled']).toBe(true);
    expect(view.trigger?.['disabled']).toBe(true);
  });

  it('formats an empty value as an empty string', () => {
    expect(formatPickedDate(null, 'en-US')).toBe('');
  });
});
