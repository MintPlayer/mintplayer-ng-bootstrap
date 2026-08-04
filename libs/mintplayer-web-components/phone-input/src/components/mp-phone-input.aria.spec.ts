import { beforeEach, describe, expect, it } from 'vitest';
import './mp-phone-input';
import type { MpPhoneInput } from './mp-phone-input';

/**
 * The composite's ARIA contract (PRD §6): the tel input is the role-bearing
 * value control, named by `input-label` with host `aria-label` winning; the
 * picker is named by `country-label`; the dial code is context (described-by),
 * the flag decorative; the error channel follows the mp-select shape —
 * `aria-errormessage` + `aria-describedby` onto the in-shadow feedback node,
 * only while `invalid`.
 */
async function mount(attrs = ''): Promise<MpPhoneInput> {
  document.body.innerHTML = `<mp-phone-input country="be" ${attrs}></mp-phone-input>`;
  const el = document.body.querySelector('mp-phone-input') as MpPhoneInput;
  await el.updateComplete;
  return el;
}

const tel = (el: MpPhoneInput) => el.shadowRoot!.querySelector('input[type="tel"]') as HTMLInputElement;

describe('mp-phone-input ARIA', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the tel input: default, input-label, host aria-label wins', async () => {
    expect(tel(await mount()).getAttribute('aria-label')).toBe('Phone number');
    expect(tel(await mount('input-label="Telefoonnummer"')).getAttribute('aria-label')).toBe('Telefoonnummer');
    const host = await mount('input-label="Telefoonnummer" aria-label="Mobiel"');
    expect(tel(host).getAttribute('aria-label')).toBe('Mobiel');
  });

  it('names the picker via country-label, localized by the consumer', async () => {
    const el = await mount('country-label="Land"');
    expect(el.shadowRoot!.querySelector('mp-select')?.getAttribute('input-label')).toBe('Land');
    expect((await mount()).shadowRoot!.querySelector('mp-select')?.getAttribute('input-label')).toBe('Country');
  });

  it('describes the tel input by the dial code — context, not name', async () => {
    const el = await mount();
    const dial = el.shadowRoot!.querySelector('.addon')!;
    expect(tel(el).getAttribute('aria-describedby')).toContain(dial.id);
    expect(dial.textContent).toContain('+32');
  });

  it('keeps the flag decorative', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.flag')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('error channel: persists in the feedback node, referenced only while invalid', async () => {
    const el = await mount('error-text="Enter a valid phone number"');
    // Valid: the message exists nowhere.
    expect(el.shadowRoot!.querySelector('.invalid-feedback')?.textContent ?? '').not.toContain('valid phone');
    expect(tel(el).getAttribute('aria-invalid')).toBeNull();

    el.setAttribute('invalid', '');
    await el.updateComplete;
    const feedback = el.shadowRoot!.querySelector('.invalid-feedback')!;
    expect(feedback.textContent).toContain('Enter a valid phone number');
    expect(tel(el).getAttribute('aria-invalid')).toBe('true');
    expect(tel(el).getAttribute('aria-errormessage')).toBe(feedback.id);
    expect(tel(el).getAttribute('aria-describedby')).toContain(feedback.id);

    el.removeAttribute('invalid');
    await el.updateComplete;
    expect(tel(el).getAttribute('aria-invalid')).toBeNull();
  });

  it('host focus() lands on the tel input, not the first focusable (D13)', async () => {
    const el = await mount();
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(tel(el));
  });

  it('required reflects onto the tel input', async () => {
    const el = await mount('required');
    expect(tel(el).getAttribute('aria-required')).toBe('true');
  });
});
