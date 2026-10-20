import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-radio';
import type { MpRadio, RadioChangeEventDetail } from './mp-radio';

async function settled(...els: HTMLElement[]): Promise<void> {
  await Promise.all(els.map((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete));
}

describe('<mp-radio>', () => {
  let host: HTMLElement;
  const radios = () => [...host.querySelectorAll('mp-radio')] as MpRadio[];
  const inputs = () => [...host.querySelectorAll('input[type=radio]')] as HTMLInputElement[];

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('renders a native radio in .form-check in the light DOM, the children as its label', async () => {
    host.innerHTML = '<mp-radio value="red" name="color">Red</mp-radio>';
    await settled(...radios());
    const [el] = radios();
    const input = inputs()[0];
    expect(el.shadowRoot).toBeNull();
    expect(input.className).toBe('form-check-input');
    expect(input.closest('label')!.className).toBe('form-check');
    expect(input.closest('label')!.textContent).toBe('Red');
    expect(input.name).toBe('color');
    expect(input.value).toBe('red');
  });

  it('renders .btn-check plus a label for the input when type="toggle_button"', async () => {
    host.innerHTML = '<mp-radio type="toggle_button" value="red" color="outline-success">Red</mp-radio>';
    await settled(...radios());
    const input = inputs()[0];
    const label = input.nextElementSibling as HTMLLabelElement;
    expect(input.className).toBe('btn-check');
    expect(label.className).toBe('btn btn-outline-success');
    expect(label.htmlFor).toBe(input.id);
  });

  it('applies the checked attribute as the initial state', async () => {
    host.innerHTML = '<mp-radio value="a" checked>A</mp-radio>';
    await settled(...radios());
    expect(inputs()[0].checked).toBe(true);
    expect(radios()[0].checked).toBe(true);
  });

  it('forms a native set with radios sharing its name: picking one unchecks the other', async () => {
    host.innerHTML = '<mp-radio name="n" value="a" checked>A</mp-radio><mp-radio name="n" value="b">B</mp-radio>';
    await settled(...radios());
    inputs()[1].click();
    expect(radios().map((radio) => radio.checked)).toEqual([false, true]);
  });

  it('emits change with detail, and stops the native change', async () => {
    host.innerHTML = '<mp-radio value="a">A</mp-radio>';
    await settled(...radios());
    const events: Event[] = [];
    radios()[0].addEventListener('change', (event) => events.push(event));
    inputs()[0].click();
    expect(events).toHaveLength(1);
    expect((events[0] as CustomEvent<RadioChangeEventDetail>).detail).toEqual({ checked: true, value: 'a' });
  });

  it('moves host aria-label and aria-describedby onto the input', async () => {
    host.innerHTML = '<mp-radio value="a" aria-label="Pick A" aria-describedby="hint"></mp-radio>';
    await settled(...radios());
    expect(inputs()[0].getAttribute('aria-label')).toBe('Pick A');
    expect(inputs()[0].getAttribute('aria-describedby')).toBe('hint');
  });

  it('marks the input invalid and references the error message only while invalid', async () => {
    host.innerHTML = '<mp-radio value="a" error-text="Pick one.">A</mp-radio>';
    await settled(...radios());
    expect(inputs()[0].hasAttribute('aria-errormessage')).toBe(false);
    radios()[0].setAttribute('invalid', '');
    await settled(...radios());
    const input = inputs()[0];
    const id = input.getAttribute('aria-errormessage')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(id);
    expect(host.querySelector(`[id="${id}"]`)!.textContent).toBe('Pick one.');
  });

  it('submits through the native input', async () => {
    host.innerHTML = '<form><mp-radio name="n" value="a" checked>A</mp-radio></form>';
    await settled(...radios());
    expect(new FormData(host.querySelector('form')!).get('n')).toBe('a');
  });
});
