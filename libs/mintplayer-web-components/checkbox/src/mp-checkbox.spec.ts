import { afterEach, describe, expect, it } from 'vitest';
import { MpCheckbox, MpCheckboxGroup, MpToggleButton } from './index';

void MpCheckbox; // force the side-effect registrations
void MpCheckboxGroup;
void MpToggleButton;

/**
 * The generated Lit checkbox group (#458 M4): light DOM, Bootstrap form-check
 * markup, a native checkbox that submits with the form. The group hands its
 * checkboxes an array field name and reacts only to its own checkboxes.
 */
type Lit = HTMLElement & { updateComplete: Promise<unknown> };

async function mount(html: string): Promise<void> {
  document.body.innerHTML = html;
  const elements = [...document.body.querySelectorAll<Lit>('mp-checkbox, mp-toggle-button, mp-checkbox-group')];
  await Promise.all(elements.map((el) => el.updateComplete));
  await Promise.all(elements.map((el) => el.updateComplete));
}

async function settle(): Promise<void> {
  const elements = [...document.body.querySelectorAll<Lit>('mp-checkbox, mp-toggle-button, mp-checkbox-group')];
  await Promise.all(elements.map((el) => el.updateComplete));
  await Promise.all(elements.map((el) => el.updateComplete));
}

const boxes = (selector: string) => [...document.body.querySelectorAll<HTMLInputElement>(`${selector} input[type=checkbox]`)];

describe('mp-checkbox / mp-toggle-button / mp-checkbox-group', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders Bootstrap form-check markup in the light DOM', async () => {
    await mount('<mp-checkbox name="agree" value="yes">Agree</mp-checkbox>');
    const el = document.querySelector('mp-checkbox') as MpCheckbox;
    expect(el.shadowRoot).toBeNull();
    expect(el.classList.contains('form-check')).toBe(true);
    expect(el.getAttribute('data-mps')).toBe('checkbox');
    const input = el.querySelector(':scope > input.form-check-input[type=checkbox]') as HTMLInputElement;
    expect(input.name).toBe('agree');
    expect(input.value).toBe('yes');
    expect(el.querySelector(':scope > label.form-check-label')?.getAttribute('for')).toBe(input.id);
  });

  it('a user toggle writes checked back, dispatches checkedchange and clears the mixed state', async () => {
    await mount('<mp-checkbox>All</mp-checkbox>');
    const el = document.querySelector('mp-checkbox') as MpCheckbox;
    el.indeterminate = true;
    await settle();
    const input = boxes('mp-checkbox')[0];
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute('aria-checked')).toBe('mixed');

    const seen: unknown[] = [];
    el.addEventListener('checkedchange', (e) => seen.push((e as CustomEvent).detail));
    input.click();
    await settle();
    expect(el.checked).toBe(true);
    expect(el.indeterminate).toBe(false);
    expect(input.hasAttribute('aria-checked')).toBe(false);
    expect(seen).toEqual([true]);
  });

  it('a switch carries the switch role', async () => {
    await mount('<mp-checkbox type="switch">Dark</mp-checkbox>');
    expect(document.querySelector('mp-checkbox')?.classList.contains('form-switch')).toBe(true);
    expect(boxes('mp-checkbox')[0].getAttribute('role')).toBe('switch');
  });

  it('a toggle button is btn-check + label.btn and keeps the native checkbox role', async () => {
    await mount('<mp-toggle-button color="outline-success" checked>Bold</mp-toggle-button>');
    const input = boxes('mp-toggle-button')[0];
    expect(input.classList.contains('btn-check')).toBe(true);
    expect(input.checked).toBe(true);
    expect(input.hasAttribute('role')).toBe(false);
    expect(document.querySelector('mp-toggle-button label')?.className).toContain('btn btn-outline-success');
  });

  it('a group names its checkboxes as an array field and reports its selection in document order', async () => {
    await mount(`
      <mp-checkbox-group name="toppings" aria-label="Toppings">
        <mp-checkbox value="ham">Ham</mp-checkbox>
        <mp-checkbox value="cheese">Cheese</mp-checkbox>
        <mp-checkbox value="olives">Olives</mp-checkbox>
      </mp-checkbox-group>`);
    const group = document.querySelector('mp-checkbox-group') as MpCheckboxGroup;
    expect(group.getAttribute('role')).toBe('group');
    group.value = ['cheese'];
    await settle();
    const [ham, cheese, olives] = boxes('mp-checkbox-group');
    expect([ham, cheese, olives].map((b) => b.name)).toEqual(['toppings[]', 'toppings[]', 'toppings[]']);
    expect([ham, cheese, olives].map((b) => b.checked)).toEqual([false, true, false]);

    const seen: unknown[] = [];
    group.addEventListener('valuechange', (e) => seen.push((e as CustomEvent).detail));
    olives.click();
    await settle();
    ham.click();
    await settle();
    expect(group.value).toEqual(['ham', 'cheese', 'olives']);
    expect(seen).toEqual([['cheese', 'olives'], ['ham', 'cheese', 'olives']]);
  });

  it('a nested group is its own: the nearest group wins', async () => {
    await mount(`
      <mp-checkbox-group id="outer" name="outer">
        <mp-checkbox value="a">A</mp-checkbox>
        <mp-checkbox-group id="inner" name="inner"><mp-checkbox value="x">X</mp-checkbox></mp-checkbox-group>
      </mp-checkbox-group>`);
    const outer = document.getElementById('outer') as MpCheckboxGroup;
    const inner = document.getElementById('inner') as MpCheckboxGroup;
    const x = boxes('#inner')[0];
    expect(x.name).toBe('inner[]');
    x.click();
    await settle();
    expect(inner.value).toEqual(['x']);
    expect(outer.value).toEqual([]);
  });
});
