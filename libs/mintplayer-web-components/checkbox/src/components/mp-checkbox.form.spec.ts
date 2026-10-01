import { beforeEach, describe, expect, it } from 'vitest';
import './mp-checkbox';
import type { MpCheckbox } from './mp-checkbox';

/** Form association and the property surface of mp-checkbox. */
async function mount(markup: string): Promise<MpCheckbox> {
  document.body.innerHTML = markup;
  const el = document.body.querySelector('mp-checkbox') as MpCheckbox;
  await el.updateComplete;
  return el;
}

const inner = (el: MpCheckbox) => el.shadowRoot!.querySelector('input') as HTMLInputElement;

/** jsdom's ElementInternals has no setValidity; record what the element reports. */
function recordValidity(el: MpCheckbox): ValidityStateFlags[] {
  const calls: ValidityStateFlags[] = [];
  const internals = (el as unknown as { internals: ElementInternals }).internals;
  (internals as unknown as { setValidity: (f: ValidityStateFlags) => void }).setValidity = (f) => calls.push(f);
  return calls;
}

describe('mp-checkbox form association', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('submits its value while checked, "on" without a value, nothing while unchecked', async () => {
    const el = await mount('<mp-checkbox>C</mp-checkbox>');
    expect(el.formValue()).toBeNull();
    el.checked = true;
    expect(el.formValue()).toBe('on');
    el.value = 'agree';
    expect(el.formValue()).toBe('agree');
  });

  it('a form reset clears both checked and indeterminate, attributes included', async () => {
    const el = await mount('<mp-checkbox checked indeterminate>C</mp-checkbox>');
    (el as unknown as { formResetCallback(): void }).formResetCallback();
    await el.updateComplete;
    expect(el.checked).toBe(false);
    expect(el.indeterminate).toBe(false);
    expect(el.hasAttribute('checked')).toBe(false);
    expect(el.hasAttribute('indeterminate')).toBe(false);
    expect(inner(el).checked).toBe(false);
  });

  it('formRestore checks for any saved state, reflecting it, and unchecks for none', async () => {
    const el = await mount('<mp-checkbox>C</mp-checkbox>');
    el.formRestore('on');
    await el.updateComplete;
    expect(el.checked).toBe(true);
    expect(el.hasAttribute('checked')).toBe(true);
    el.formRestore(null);
    await el.updateComplete;
    expect(el.checked).toBe(false);
    expect(el.hasAttribute('checked')).toBe(false);
  });

  it('reports valueMissing while required and unchecked, then clears it', async () => {
    const el = await mount('<mp-checkbox>C</mp-checkbox>');
    const calls = recordValidity(el);
    el.setAttribute('required', '');
    await el.updateComplete;
    expect(calls.at(-1)).toEqual({ valueMissing: true });
    el.checked = true;
    await el.updateComplete;
    expect(calls.at(-1)).toEqual({ valueMissing: false });
  });

  it('anchors validity on the inner checkbox', async () => {
    const el = await mount('<mp-checkbox>C</mp-checkbox>');
    expect(el.formValidityAnchor()).toBe(inner(el));
  });
});

describe('mp-checkbox property surface', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('name and value reach the inner input from properties and attributes', async () => {
    const el = await mount('<mp-checkbox name="n" value="v">C</mp-checkbox>');
    expect(inner(el).getAttribute('name')).toBe('n');
    expect(inner(el).getAttribute('value')).toBe('v');
    el.name = null;
    el.value = null;
    await el.updateComplete;
    expect(inner(el).hasAttribute('name')).toBe(false);
    expect(inner(el).hasAttribute('value')).toBe(false);
    el.name = 'm';
    el.value = 'w';
    await el.updateComplete;
    expect([el.name, el.value]).toEqual(['m', 'w']);
    expect(inner(el).getAttribute('name')).toBe('m');
  });

  it('disabled reflects and reaches the inner input, and the attribute drives it back', async () => {
    const el = await mount('<mp-checkbox>C</mp-checkbox>');
    el.disabled = true;
    await el.updateComplete;
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(inner(el).disabled).toBe(true);
    el.removeAttribute('disabled');
    await el.updateComplete;
    expect(el.disabled).toBe(false);
    expect(inner(el).disabled).toBe(false);
  });

  it('type switches variants and rejects unknown types', async () => {
    const el = await mount('<mp-checkbox>C</mp-checkbox>');
    el.type = 'switch';
    await el.updateComplete;
    expect(inner(el).getAttribute('role')).toBe('switch');
    el.type = 'dial' as never;
    expect(el.type).toBe('switch');
    el.setAttribute('type', 'dial');
    expect(el.type).toBe('switch');
  });

  it('the toggle-button variant takes its color from the color property and attribute', async () => {
    const el = await mount('<mp-checkbox type="toggle_button">C</mp-checkbox>');
    el.color = 'success';
    await el.updateComplete;
    const label = () => el.shadowRoot!.querySelector('label')!;
    expect(label().className).toBe('btn btn-success');
    el.color = 'neon' as never;
    expect(el.color).toBe('success');
    el.setAttribute('color', 'outline-dark');
    await el.updateComplete;
    expect(label().className).toBe('btn btn-outline-dark');
    el.setAttribute('color', 'neon');
    expect(el.color).toBe('outline-dark');
  });

  it('the toggle-button variant announces pressed state that follows checked', async () => {
    const el = await mount('<mp-checkbox type="toggle_button">C</mp-checkbox>');
    expect(inner(el).getAttribute('aria-pressed')).toBe('false');
    el.checked = true;
    await el.updateComplete;
    expect(inner(el).getAttribute('aria-pressed')).toBe('true');
  });

  it('indeterminate announces as mixed, and the attribute drives it', async () => {
    const el = await mount('<mp-checkbox>C</mp-checkbox>');
    el.setAttribute('indeterminate', '');
    await el.updateComplete;
    expect(el.indeterminate).toBe(true);
    expect(inner(el).getAttribute('aria-checked')).toBe('mixed');
  });

  it('a user change on an indeterminate box resolves it and reports both states', async () => {
    const el = await mount('<mp-checkbox indeterminate value="v">C</mp-checkbox>');
    const details: unknown[] = [];
    el.addEventListener('change', (e) => details.push((e as CustomEvent).detail));
    const input = inner(el);
    input.indeterminate = false;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(details).toEqual([{ checked: true, indeterminate: false, value: 'v' }]);
    expect(el.hasAttribute('indeterminate')).toBe(false);
    expect(el.hasAttribute('checked')).toBe(true);
  });
});
