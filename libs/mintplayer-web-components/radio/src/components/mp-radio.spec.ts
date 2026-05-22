import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-radio';
import type { MpRadio, RadioChangeEventDetail } from './mp-radio';
async function settled(el: HTMLElement): Promise<void> {
  if ('updateComplete' in el) {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  }
}

describe('<mp-radio>', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('renders the form-check radio variant by default', async () => {
    host.innerHTML = '<mp-radio value="red" name="color">Red</mp-radio>';
    const el = host.firstElementChild as MpRadio;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input[type="radio"]') as HTMLInputElement;
    const label = el.shadowRoot!.querySelector('label');
    expect(input).toBeTruthy();
    expect(input.className).toBe('form-check-input');
    expect(label!.className).toBe('form-check');
  });

  it('renders the btn-check variant when type="toggle_button"', async () => {
    host.innerHTML = '<mp-radio type="toggle_button" value="red" color="outline-success">Red</mp-radio>';
    const el = host.firstElementChild as MpRadio;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input[type="radio"]') as HTMLInputElement;
    const label = el.shadowRoot!.querySelector('label')!;
    expect(input.className).toBe('btn-check');
    expect(label.className).toContain('btn-outline-success');
  });

  it('dispatches `change` with detail `{ checked, value }` when toggled', async () => {
    host.innerHTML = '<mp-radio value="red" name="color">Red</mp-radio>';
    const el = host.firstElementChild as MpRadio;
    await settled(el);

    const received: RadioChangeEventDetail[] = [];
    el.addEventListener('change', (ev) => {
      received.push((ev as CustomEvent<RadioChangeEventDetail>).detail);
    });

    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(received).toEqual([{ checked: true, value: 'red' }]);
    expect(el.checked).toBe(true);
    expect(el.hasAttribute('checked')).toBe(true);
  });

  it('reflects `checked` to attribute when set programmatically', async () => {
    host.innerHTML = '<mp-radio value="red"></mp-radio>';
    const el = host.firstElementChild as MpRadio;
    await settled(el);
    el.checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(false);
  });

  it('honours `name` on the inner input (required for native radio grouping within the same scope)', async () => {
    host.innerHTML = '<mp-radio name="color" value="red"></mp-radio>';
    const el = host.firstElementChild as MpRadio;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.name).toBe('color');
  });

  it('disables the inner input when `disabled` is set', async () => {
    host.innerHTML = '<mp-radio disabled value="red"></mp-radio>';
    const el = host.firstElementChild as MpRadio;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
