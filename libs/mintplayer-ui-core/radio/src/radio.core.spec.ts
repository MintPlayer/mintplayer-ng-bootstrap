import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { connectRadio, ownsRadio, RADIO_GROUP, radioCore, radioGroupCore, type RadioGroupContext, type RadioInputs, type RadioView } from './radio.core';

afterEach(() => document.body.replaceChildren());

const inputs = (o: Partial<RadioInputs> = {}): RadioInputs => ({
  type: 'radio',
  color: 'primary' as never,
  inline: false,
  value: 'a',
  checked: false,
  name: 'pick',
  disabled: false,
  required: false,
  invalid: false,
  errorText: null,
  inputLabel: null,
  ...o,
});

const markup = ({ view }: { view: RadioView }, host: HTMLElement) =>
  (applyBag(host, view.root), [el('input', view.input), el('label', view.label, 'A')]);

const lone: RadioGroupContext = RADIO_GROUP.defaultValue;

describe('radio views', () => {
  it('renders a check or a toggle button, named, invalid and grouped', () => {
    const toggle = connectRadio({ id: 'r', inputs: inputs({ type: 'toggle_button', color: 'nope' as never, invalid: true, errorText: 'Pick one' }), group: lone, checked: true, label: 'Mine' });
    expect(toggle.root['class']).toBe('radio-toggle');
    expect(toggle.input).toMatchObject({ class: 'btn-check is-invalid', 'aria-label': 'Mine', 'aria-invalid': 'true', checked: true });
    expect(toggle.label['class']).toBe('btn btn-secondary');
    expect(toggle.feedback).not.toBeNull();
    const grouped = connectRadio({ id: 'r', inputs: inputs({ inline: true, inputLabel: 'Own' }), group: { grouped: true, name: 'g', value: null, disabled: true, required: true }, checked: false, label: null });
    expect(grouped.root['class']).toBe('form-check form-check-inline');
    expect(grouped.input).toMatchObject({ name: 'g', disabled: true, required: true, 'aria-label': 'Own' });
  });
});

describe('radioCore', () => {
  it('reports becoming checked and follows the consumer', () => {
    const h = hostCore(radioCore, inputs(), { models: ['checked', 'value'], markup, context: lone });
    h.attach();
    const input = h.host.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(h.state().checked).toBe(true);
    expect(h.changes('checked')).toEqual([true]);
    h.setInputs({ checked: true });
    h.setInputs({ checked: false });
    expect(h.state().checked).toBe(false);
    h.setInputs({ value: 'b' });
    h.dispose();
  });

  it('reads its selection from the group, and attaches without an input', () => {
    const grouped = hostCore(radioCore, inputs({ value: 'b' }), { models: ['checked', 'value'], context: { ...lone, grouped: true, value: 'b' } });
    expect(grouped.props().view.checked).toBe(true);
    const bare = hostCore(radioCore, inputs(), { models: ['checked', 'value'], context: lone, markup: () => null });
    bare.attach();
    bare.dispose();
  });
});

describe('radioGroupCore', () => {
  function mount() {
    const h = hostCore(radioGroupCore, { name: null, value: 'a', disabled: false, required: true }, { models: ['checked', 'value'], markup: ({ root }, host) => (applyBag(host, root), undefined) });
    const radios = ['a', 'b'].map((v) => h.host.appendChild(el('div', null, el('input', { type: 'radio', value: v }))).firstElementChild as HTMLInputElement);
    h.attach();
    return { ...h, radios };
  }

  it('provides its name and value, derived from its id without a name', () => {
    const h = mount();
    expect(h.host.getAttribute('aria-required')).toBe('true');
    expect(radioGroupCore.provide!({ inputs: h.inputs(), state: h.state(), id: 'g' } as never)).toEqual({ grouped: true, name: 'g-name', value: 'a', disabled: false, required: true });
    expect(radioGroupCore.provide!({ inputs: { ...h.inputs(), name: 'own' }, state: h.state(), id: 'g' } as never)).toMatchObject({ name: 'own' });
  });

  it('takes the value of its own radios, never a nested group’s or another input', () => {
    const h = mount();
    h.radios[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.state().value).toBe('b');
    const nested = h.host.appendChild(el('div', { 'data-radio-group': '' }, el('input', { type: 'radio', value: 'x' })));
    nested.firstElementChild!.dispatchEvent(new Event('change', { bubbles: true }));
    h.host.appendChild(el('input', { type: 'text' })).dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.changes('value')).toEqual(['b']);
    expect(ownsRadio(h.host, null)).toBe(false);
    h.setInputs({ value: undefined as never });
    expect(h.state().value).toBeNull();
    h.setInputs({ disabled: true });
    h.dispose();
  });
});
