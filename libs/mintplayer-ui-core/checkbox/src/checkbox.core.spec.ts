import { applyBag, el, hostCore } from '../../_conformance/host-core';
import {
  CHECKBOX_GROUP,
  checkboxCore,
  checkboxGroupCore,
  connectCheckbox,
  groupSelection,
  isToggleButtonColor,
  ownsCheckbox,
  toggleButtonCore,
  type CheckboxGroupContext,
  type CheckboxInputs,
  type CheckboxView,
} from './checkbox';

afterEach(() => document.body.replaceChildren());

const inputs = (o: Partial<CheckboxInputs> = {}): CheckboxInputs => ({
  type: 'checkbox',
  color: 'primary',
  checked: false,
  indeterminate: false,
  name: 'agree',
  value: 'a',
  disabled: false,
  required: false,
  invalid: false,
  errorText: null,
  inputLabel: null,
  ...o,
});

const markup = ({ view }: { view: CheckboxView }, host: HTMLElement) =>
  (applyBag(host, view.root), [el('input', view.input), el('label', view.label, 'A')]);

const lone: CheckboxGroupContext = CHECKBOX_GROUP.defaultValue;

describe('checkbox views', () => {
  it('renders a checkbox, a switch and a toggle button', () => {
    const check = connectCheckbox({ id: 'c', inputs: inputs({ indeterminate: true, required: true, invalid: true, errorText: 'Agree' }), group: lone, checked: false, indeterminate: true, label: null });
    expect(check.root['class']).toBe('form-check');
    expect(check.input).toMatchObject({ class: 'form-check-input is-invalid', name: 'agree', role: null, 'aria-checked': 'mixed', 'aria-required': 'true', 'aria-invalid': 'true' });
    expect(check.indeterminate).toBe(true);
    expect(check.label).toEqual({ class: 'form-check-label', for: 'c-input' });
    expect(check.feedback).not.toBeNull();

    const sw = connectCheckbox({ id: 'c', inputs: inputs({ type: 'switch', inputLabel: 'Own' }), group: lone, checked: true, indeterminate: false, label: null });
    expect(sw.root['class']).toBe('form-check form-switch');
    expect(sw.input).toMatchObject({ role: 'switch', 'aria-label': 'Own', checked: true, 'aria-checked': null });

    const toggle = connectCheckbox({ id: 'c', inputs: inputs({ type: 'toggle_button', color: 'nope' as never }), group: lone, checked: false, indeterminate: true, label: 'Mine' });
    expect(toggle.root['class']).toBe('checkbox-toggle');
    expect(toggle.input).toMatchObject({ class: 'btn-check', 'aria-label': 'Mine', 'aria-checked': null });
    expect(toggle.indeterminate).toBe(false);
    expect(toggle.label['class']).toBe('btn btn-primary');
    expect(connectCheckbox({ id: 'c', inputs: inputs({ type: 'toggle_button', color: 'outline-danger' }), group: lone, checked: false, indeterminate: false, label: null }).label['class']).toBe('btn btn-outline-danger');
  });

  it('submits as the group’s array name, disabled with the group', () => {
    const named = connectCheckbox({ id: 'c', inputs: inputs(), group: { grouped: true, name: 'g', value: [], disabled: true }, checked: false, indeterminate: false, label: null });
    expect(named.input).toMatchObject({ name: 'g[]', disabled: true });
    expect(connectCheckbox({ id: 'c', inputs: inputs(), group: { grouped: true, name: null, value: [], disabled: false }, checked: false, indeterminate: false, label: null }).input['name']).toBeNull();
  });

  it('knows the toggle button colours', () => {
    expect(isToggleButtonColor('outline-dark')).toBe(true);
    expect(isToggleButtonColor('purple')).toBe(false);
  });
});

describe('checkboxCore', () => {
  it('reports a toggle, clearing the mixed state', () => {
    const h = hostCore(checkboxCore, inputs({ indeterminate: true }), { models: ['checked', 'indeterminate', 'value'], markup, context: lone });
    h.attach();
    const input = h.host.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(h.state()).toEqual({ checked: true, indeterminate: false });
    expect(h.changes('checked')).toEqual([true]);
    expect(h.changes('indeterminate')).toEqual([false]);
    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(h.changes('indeterminate')).toEqual([false]);
    h.dispose();
  });

  it('follows the consumer’s checked and mixed state', () => {
    const h = hostCore(checkboxCore, inputs(), { models: ['checked', 'indeterminate', 'value'], markup, context: lone });
    h.attach();
    h.setInputs({ checked: true });
    expect(h.state().checked).toBe(true);
    h.setInputs({ indeterminate: true });
    expect(h.state().indeterminate).toBe(true);
    h.setInputs({ name: 'other' });
    expect(h.state()).toEqual({ checked: true, indeterminate: true });
    h.dispose();
  });

  it('reads its checked state from the group, and attaches without an input', () => {
    const ctx = { grouped: true, name: 'g', value: ['a'], disabled: false };
    expect(hostCore(checkboxCore, inputs(), { models: ['checked', 'indeterminate', 'value'], context: ctx }).props().view.checked).toBe(true);
    expect(hostCore(checkboxCore, inputs({ value: null }), { models: ['checked', 'indeterminate', 'value'], context: ctx }).props().view.checked).toBe(false);
    const bare = hostCore(checkboxCore, inputs(), { models: ['checked', 'indeterminate', 'value'], context: lone, markup: () => null });
    bare.attach();
    bare.dispose();
  });
});

describe('toggleButtonCore', () => {
  it('is a checkbox of type toggle_button that is never mixed', () => {
    const { indeterminate: _, type: __, ...rest } = inputs();
    const h = hostCore(toggleButtonCore, rest, { models: ['checked', 'indeterminate', 'value'], context: lone });
    expect(h.props().view.root['class']).toBe('checkbox-toggle');
    expect(h.state().indeterminate).toBe(false);
    h.attach();
    h.setInputs({ checked: true });
    expect(h.state().checked).toBe(true);
  });
});

describe('checkboxGroupCore', () => {
  function mount() {
    const h = hostCore(checkboxGroupCore, { name: 'g', value: ['a'], disabled: true }, { models: ['checked', 'indeterminate', 'value'], markup: ({ root }, host) => (applyBag(host, root), undefined) });
    const boxes = ['a', 'b', 'c'].map((v) => h.host.appendChild(el('div', null, el('input', { type: 'checkbox', value: v }))).firstElementChild as HTMLInputElement);
    h.attach();
    return { ...h, boxes };
  }

  it('marks its element and provides its selection', () => {
    const h = mount();
    expect(h.host.getAttribute('role')).toBe('group');
    expect(h.host.hasAttribute('data-checkbox-group')).toBe(true);
    expect(h.host.getAttribute('aria-disabled')).toBe('true');
    expect(checkboxGroupCore.provide!({ inputs: h.inputs(), state: h.state() } as never)).toEqual({ grouped: true, name: 'g', value: ['a'], disabled: true });
  });

  it('takes the values of its own checked checkboxes, never a nested group’s or another input', () => {
    const h = mount();
    h.boxes[0].checked = true;
    h.boxes[2].checked = true;
    h.boxes[2].dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.state().value).toEqual(['a', 'c']);
    expect(groupSelection(h.host)).toEqual(['a', 'c']);
    const nested = h.host.appendChild(el('div', { 'data-checkbox-group': '' }, el('input', { type: 'checkbox', value: 'x' })));
    (nested.firstElementChild as HTMLInputElement).checked = true;
    nested.firstElementChild!.dispatchEvent(new Event('change', { bubbles: true }));
    h.host.appendChild(el('input', { type: 'text' })).dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.changes('value')).toEqual([['a', 'c']]);
    expect(ownsCheckbox(h.host, null)).toBe(false);
    h.setInputs({ value: undefined as never });
    expect(h.state().value).toEqual([]);
    h.setInputs({ disabled: false });
    h.dispose();
  });
});
