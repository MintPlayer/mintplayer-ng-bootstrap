import { connect } from './connect';
import { DEFAULT_TYPEAHEAD_LABELS, TypeaheadState } from './types';

const base: TypeaheadState<{ text: string }> = {
  term: 'kru',
  items: [{ text: 'A' }, { text: 'B' }],
  status: 'ready',
  open: true,
  activeIndex: 1,
  selectedItem: null,
  announcement: '2 results found',
  disabled: false,
  errorText: null,
  labels: { ...DEFAULT_TYPEAHEAD_LABELS, input: 'Street' },
};

describe('connect()', () => {
  it('derives the combobox bags from an open snapshot with an active option', () => {
    const api = connect(base, 'ta', { name: 'q' });
    expect(api.input).toMatchObject({
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'true',
      'aria-controls': 'ta-listbox',
      'aria-activedescendant': 'ta-opt-1',
      'aria-label': 'Street',
      autocomplete: 'off',
      disabled: false,
      name: 'q',
      value: 'kru',
      'data-mps': 'typeahead',
    });
    expect(api.input['aria-invalid']).toBeNull();
    expect(api.listbox).toMatchObject({ id: 'ta-listbox', role: 'listbox', hidden: false, 'aria-busy': null });
    expect(api.option(1)).toMatchObject({ id: 'ta-opt-1', role: 'option', 'aria-selected': 'true', 'data-active': true });
    expect(api.option(0)).toMatchObject({ 'aria-selected': 'false', 'data-active': null });
    expect(api.status).toBeNull();
    expect(api.live).toEqual({ attrs: { 'data-mps': 'typeahead', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, text: '2 results found' });
    expect(api.error).toBeNull();
  });

  it('closed: aria-activedescendant absent, listbox hidden but still controlled', () => {
    const api = connect({ ...base, open: false, activeIndex: -1 }, 'ta');
    expect(api.input['aria-expanded']).toBe('false');
    expect(api.input['aria-activedescendant']).toBeNull();
    expect(api.input['aria-controls']).toBe('ta-listbox');
    expect(api.listbox['hidden']).toBe(true);
  });

  it('loading and no-results status rows; aria-busy while loading', () => {
    expect(connect({ ...base, status: 'loading', items: [] }, 'ta').status).toEqual({ attrs: { 'data-mps': 'typeahead', role: 'presentation' }, text: 'Loading…' });
    expect(connect({ ...base, status: 'loading', items: [] }, 'ta').listbox['aria-busy']).toBe('true');
    expect(connect({ ...base, status: 'ready', items: [] }, 'ta').status?.text).toBe('No suggestions found');
    expect(connect({ ...base, status: 'error', items: [] }, 'ta').status).toBeNull();
  });

  it('error text wires aria-describedby, aria-errormessage and aria-invalid to the error node', () => {
    const api = connect({ ...base, errorText: 'Pick a street' }, 'ta');
    expect(api.input['aria-describedby']).toBe('ta-error');
    expect(api.input['aria-errormessage']).toBe('ta-error');
    expect(api.input['aria-invalid']).toBe('true');
    expect(api.error).toEqual({ attrs: { 'data-mps': 'typeahead', id: 'ta-error' }, text: 'Pick a street' });
  });

  it('disabled reaches the input', () => {
    expect(connect({ ...base, disabled: true }, 'ta').input['disabled']).toBe(true);
  });
});
