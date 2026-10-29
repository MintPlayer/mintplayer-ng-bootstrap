import { afterEach, describe, expect, it } from 'vitest';
import { MpOtpInput } from './generated';

void MpOtpInput; // force the side-effect registration

/**
 * The Lit otp-input front (#437): light DOM, rendered from the template
 * compiled out of `@mintplayer/ui-core/otp-input`. The core's spec covers the
 * bags; this file pins the element: one real input that types, pastes,
 * reports and submits, with the boxes as decoration.
 */

async function settle(el: MpOtpInput): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function mount(markup: string): Promise<MpOtpInput> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const el = host.querySelector('mp-otp-input') as MpOtpInput;
  await settle(el);
  return el;
}

const inner = (el: MpOtpInput) => el.querySelector('input') as HTMLInputElement;

function type(el: MpOtpInput, text: string): void {
  inner(el).value = text;
  inner(el).dispatchEvent(new InputEvent('input', { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-otp-input', () => {
  it('renders one named input and six boxes in the light DOM', async () => {
    const el = await mount('<mp-otp-input name="code"></mp-otp-input>');
    expect(el.shadowRoot).toBeNull();
    expect(inner(el).name).toBe('code');
    expect(el.querySelectorAll('.otp-box')).toHaveLength(6);
  });

  it('filters typed text, reports valuechange and fills the boxes', async () => {
    const el = await mount('<mp-otp-input></mp-otp-input>');
    const seen: string[] = [];
    el.addEventListener('valuechange', (e) => seen.push((e as CustomEvent<string>).detail));
    type(el, '1a2');
    await settle(el);
    expect(inner(el).value).toBe('12');
    expect(el.value).toBe('12');
    expect(seen.at(-1)).toBe('12');
    expect([...el.querySelectorAll('.otp-box-content')].map((n) => n.textContent)).toEqual(['1', '2', '', '', '', '']);
  });

  it('fires complete once every box is filled', async () => {
    const el = await mount('<mp-otp-input></mp-otp-input>');
    const done: string[] = [];
    el.addEventListener('complete', (e) => done.push((e as CustomEvent<string>).detail));
    type(el, '12345');
    await settle(el);
    expect(done).toEqual([]);
    type(el, '123456');
    await settle(el);
    expect(done).toEqual(['123456']);
  });

  it('uppercases an alphanumeric code per letter-case', async () => {
    const el = await mount('<mp-otp-input></mp-otp-input>');
    el.type = 'alphanumeric';
    el.letterCase = 'upper';
    await settle(el);
    type(el, 'ab-c1');
    await settle(el);
    expect(el.value).toBe('ABC1');
  });

  it('clear() empties the value', async () => {
    const el = await mount('<mp-otp-input></mp-otp-input>');
    type(el, '123');
    await settle(el);
    el.clear();
    await settle(el);
    expect(inner(el).value).toBe('');
  });
});
