import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-toggle-button';
import type { MpToggleButton, ToggleChangeEventDetail } from './mp-toggle-button';
async function settled(el: HTMLElement): Promise<void> {
  if ('updateComplete' in el) {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  }
}

describe('<mp-toggle-button>', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('registers and renders an inner input + label', async () => {
    host.innerHTML = '<mp-toggle-button value="opt-a">Toggle</mp-toggle-button>';
    const el = host.firstElementChild as MpToggleButton;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input[type="checkbox"]');
    const label = el.shadowRoot!.querySelector('label');
    expect(input).toBeTruthy();
    expect(label).toBeTruthy();
    expect(label!.className).toContain('btn');
    expect(label!.className).toContain('btn-primary');
  });

  it('reflects `checked` to attribute when toggled programmatically', async () => {
    host.innerHTML = '<mp-toggle-button></mp-toggle-button>';
    const el = host.firstElementChild as MpToggleButton;
    await settled(el);
    expect(el.hasAttribute('checked')).toBe(false);
    el.checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(false);
  });

  it('dispatches a `change` event with `{ checked, value }` when the inner input toggles', async () => {
    host.innerHTML = '<mp-toggle-button value="opt-a">Toggle</mp-toggle-button>';
    const el = host.firstElementChild as MpToggleButton;
    await settled(el);

    const received: ToggleChangeEventDetail[] = [];
    el.addEventListener('change', (ev) => {
      received.push((ev as CustomEvent<ToggleChangeEventDetail>).detail);
    });

    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(received).toEqual([{ checked: true, value: 'opt-a' }]);
    expect(el.checked).toBe(true);
    expect(el.hasAttribute('checked')).toBe(true);
  });

  it('honours `color` attribute on the label class', async () => {
    host.innerHTML = '<mp-toggle-button color="outline-success"></mp-toggle-button>';
    const el = host.firstElementChild as MpToggleButton;
    await settled(el);
    const label = el.shadowRoot!.querySelector('label')!;
    expect(label.className).toContain('btn-outline-success');
  });

  it('ignores invalid `color` values', async () => {
    host.innerHTML = '<mp-toggle-button color="bogus"></mp-toggle-button>';
    const el = host.firstElementChild as MpToggleButton;
    await settled(el);
    const label = el.shadowRoot!.querySelector('label')!;
    expect(label.className).toContain('btn-primary');
  });

  it('disables the inner input when `disabled` attribute is set', async () => {
    host.innerHTML = '<mp-toggle-button disabled></mp-toggle-button>';
    const el = host.firstElementChild as MpToggleButton;
    await settled(el);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
