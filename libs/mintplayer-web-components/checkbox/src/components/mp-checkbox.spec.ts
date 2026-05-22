import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-checkbox';
import type { MpCheckbox, CheckboxChangeEventDetail } from './mp-checkbox';
async function settled(el: HTMLElement): Promise<void> {
  if ('updateComplete' in el) {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  }
}

describe('<mp-checkbox>', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('renders the form-check checkbox variant by default', async () => {
    host.innerHTML = '<mp-checkbox value="opt-a">Option A</mp-checkbox>';
    const el = host.firstElementChild as MpCheckbox;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const label = el.shadowRoot!.querySelector('label')!;
    expect(input.className).toBe('form-check-input');
    expect(label.className).toBe('form-check');
  });

  it('adds form-switch class on the label when type="switch"', async () => {
    host.innerHTML = '<mp-checkbox type="switch" value="opt-a"></mp-checkbox>';
    const el = host.firstElementChild as MpCheckbox;
    await settled(el);
    const label = el.shadowRoot!.querySelector('label')!;
    expect(label.className.split(/\s+/).sort()).toEqual(['form-check', 'form-switch']);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('role')).toBe('switch');
  });

  it('renders the btn-check variant when type="toggle_button"', async () => {
    host.innerHTML = '<mp-checkbox type="toggle_button" color="outline-primary"></mp-checkbox>';
    const el = host.firstElementChild as MpCheckbox;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    const label = el.shadowRoot!.querySelector('label')!;
    expect(input.className).toBe('btn-check');
    expect(label.className).toContain('btn-outline-primary');
  });

  it('sets the DOM `indeterminate` property when the attribute is present', async () => {
    host.innerHTML = '<mp-checkbox indeterminate value="all"></mp-checkbox>';
    const el = host.firstElementChild as MpCheckbox;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute('aria-checked')).toBe('mixed');
  });

  it('clears `indeterminate` when the property is toggled off', async () => {
    host.innerHTML = '<mp-checkbox indeterminate></mp-checkbox>';
    const el = host.firstElementChild as MpCheckbox;
    await settled(el);
    el.indeterminate = false;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.indeterminate).toBe(false);
    expect(el.hasAttribute('indeterminate')).toBe(false);
  });

  it('dispatches `change` with `{ checked, indeterminate, value }`', async () => {
    host.innerHTML = '<mp-checkbox value="opt-a"></mp-checkbox>';
    const el = host.firstElementChild as MpCheckbox;
    await settled(el);

    const received: CheckboxChangeEventDetail[] = [];
    el.addEventListener('change', (ev) => {
      received.push((ev as CustomEvent<CheckboxChangeEventDetail>).detail);
    });

    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(received).toEqual([{ checked: true, indeterminate: false, value: 'opt-a' }]);
    expect(el.checked).toBe(true);
  });

  it('reflects `checked`, `indeterminate`, and `disabled` to attributes', async () => {
    host.innerHTML = '<mp-checkbox></mp-checkbox>';
    const el = host.firstElementChild as MpCheckbox;
    await settled(el);
    el.checked = true;
    el.indeterminate = true;
    el.disabled = true;
    expect(el.hasAttribute('checked')).toBe(true);
    expect(el.hasAttribute('indeterminate')).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(true);
  });
});
