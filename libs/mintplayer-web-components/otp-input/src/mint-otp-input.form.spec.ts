import { afterEach, describe, expect, it } from 'vitest';
import './mint-otp-input.element';
import type { MintOtpInputElement } from './mint-otp-input.element';

async function mount(attrs: Record<string, string> = {}): Promise<MintOtpInputElement> {
  const el = document.createElement('mp-otp-input') as MintOtpInputElement;
  Object.entries(attrs).map(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('mp-otp-input groups attribute parsing', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('parses a comma list, ignoring non-numeric parts', async () => {
    const el = await mount({ groups: '3, x, 3' });
    expect(el.groups).toEqual([3, 3]);
  });

  it('falls back to six single boxes for an empty or all-garbage list', async () => {
    const empty = await mount({ groups: '' });
    expect(empty.groups).toEqual([1, 1, 1, 1, 1, 1]);
    const garbage = await mount({ groups: 'a,b' });
    expect(garbage.groups).toEqual([1, 1, 1, 1, 1, 1]);
  });
});

describe('mp-otp-input form association', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('submits nothing while empty and the code once typed', async () => {
    const el = await mount();
    expect(el.formValue()).toBeNull();
    el.value = '123456';
    expect(el.formValue()).toBe('123456');
  });

  it('a form reset clears the code and announces the change', async () => {
    const el = await mount();
    el.value = '123';
    const changes: unknown[] = [];
    el.addEventListener('value-change', (e) => changes.push((e as CustomEvent).detail));
    el.formReset();
    expect(el.value).toBe('');
    expect(changes).toHaveLength(1);
  });

  it('formRestore takes a string state and ignores anything else', async () => {
    const el = await mount();
    el.formRestore('654321');
    expect(el.value).toBe('654321');
    el.formRestore(new FormData());
    expect(el.value).toBe('654321');
  });

  it('anchors validity on the hidden input that carries the role', async () => {
    const el = await mount();
    expect(el.formValidityAnchor()).toBe(el.shadowRoot!.querySelector('.hidden-input'));
  });
});
