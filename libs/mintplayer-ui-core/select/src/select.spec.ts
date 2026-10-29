import { connectSelect, readSelection, syncSelection, type SelectOptions } from './select';

const base: SelectOptions = {
  id: 's1',
  size: 'md',
  multiple: false,
  numberVisible: null,
  disabled: false,
  required: false,
  invalid: false,
  name: null,
  label: null,
  errorText: null,
  value: null,
  values: [],
  items: [
    { value: 'a', label: 'A' },
    { label: 'G', options: [{ value: 'b', label: 'B', disabled: true }] },
  ],
  rich: false,
};

describe('connectSelect', () => {
  it('stamps the select and maps size to the Bootstrap class, unknown sizes to md', () => {
    expect(connectSelect(base).select).toMatchObject({ class: 'form-select', id: 's1' });
    expect(connectSelect({ ...base, size: 'sm' }).select['class']).toBe('form-select form-select-sm');
    expect(connectSelect({ ...base, size: 'xl' as never }).select['class']).toBe('form-select');
  });

  it('selects through each option bag, and seeds React with the value', () => {
    const view = connectSelect({ ...base, value: 'b' });
    expect(view.items![0].options[0].bag).toEqual({ value: 'a', disabled: false, selected: false });
    expect(view.items![1].group).toEqual({ label: 'G', disabled: false });
    expect(view.items![1].options[0].bag).toEqual({ value: 'b', disabled: true, selected: true });
    expect(view.value).toBe('b');
  });

  it('selects every value of a multiple select', () => {
    const view = connectSelect({ ...base, multiple: true, values: ['a', 'b'] });
    expect(view.items!.flatMap((i) => i.options.map((o) => o.bag['selected']))).toEqual([true, true]);
    expect(view.value).toEqual(['a', 'b']);
  });

  it('leaves the options to the consumer without items', () => {
    expect(connectSelect({ ...base, items: null }).items).toBeNull();
  });

  it('is rich only for a dropdown with items', () => {
    expect(connectSelect({ ...base, rich: true }).rich).toBe(true);
    expect(connectSelect({ ...base, rich: true, multiple: true }).rich).toBe(false);
    expect(connectSelect({ ...base, rich: true, numberVisible: 4 }).rich).toBe(false);
    expect(connectSelect({ ...base, rich: true, items: null }).rich).toBe(false);
  });

  it('references a stamped error message only while invalid', () => {
    const quiet = connectSelect({ ...base, errorText: 'Pick one' });
    expect(quiet.showFeedback).toBe(false);
    expect(quiet.select['aria-describedby']).toBeNull();
    const view = connectSelect({ ...base, errorText: 'Pick one', invalid: true, required: true });
    expect(view.showFeedback).toBe(true);
    expect(view.feedback.attrs).toMatchObject({ id: 's1-error' });
    expect(view.select).toMatchObject({ 'aria-invalid': 'true', 'aria-required': 'true', 'aria-errormessage': 's1-error', 'aria-describedby': 's1-error' });
  });
});

describe('syncSelection / readSelection', () => {
  const select = (multiple: boolean, html: string) => {
    const el = document.createElement('select');
    el.multiple = multiple;
    el.innerHTML = html;
    return el;
  };

  it('selects the empty placeholder for null, else nothing', () => {
    const withPlaceholder = select(false, '<option value="a">A</option><option value="">-</option>');
    syncSelection(withPlaceholder, false, null, []);
    expect(withPlaceholder.selectedIndex).toBe(1);
    expect(readSelection(withPlaceholder)).toEqual({ value: null, values: [] });
    const without = select(false, '<option value="a">A</option>');
    syncSelection(without, false, null, []);
    expect(without.selectedIndex).toBe(-1);
  });

  it('reads and writes every selected option of a multiple select', () => {
    const el = select(true, '<option value="a">A</option><option value="b">B</option><option value="c">C</option>');
    syncSelection(el, true, null, ['b', 'c']);
    expect(readSelection(el)).toEqual({ value: 'b', values: ['b', 'c'] });
  });
});
