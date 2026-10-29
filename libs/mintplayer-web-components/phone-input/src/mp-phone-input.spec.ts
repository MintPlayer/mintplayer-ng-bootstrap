import { afterEach, describe, expect, it } from 'vitest';
import type { PhoneChangeEventDetail } from '@mintplayer/ui-core/phone-input';
import { MpPhoneInput } from './index';

void MpPhoneInput; // force the side-effect registration

/**
 * The Lit phone input (#437): light DOM, rendered from the template compiled out
 * of `@mintplayer/ui-core/phone-input`. The core's spec covers the bags; this
 * file pins the typing rules (docs/prd/phone-input-wc.md D10), country handling
 * and the form contract, through real event dispatch and selection APIs.
 */

async function mount(patch: Partial<MpPhoneInput> = {}): Promise<MpPhoneInput> {
  const host = document.createElement('mp-phone-input') as MpPhoneInput;
  Object.assign(host, patch);
  document.body.append(host);
  await settle(host);
  return host;
}

async function settle(host: MpPhoneInput): Promise<void> {
  await host.updateComplete;
  await host.whenReady();
  await host.updateComplete;
}

const tel = (host: MpPhoneInput) => host.querySelector('input[type=tel]') as HTMLInputElement;
const picker = (host: MpPhoneInput) => host.querySelector('select') as HTMLSelectElement;

/** The browser's beforeinput, value mutation, input sequence. */
function type(host: MpPhoneInput, next: string, caret = next.length): void {
  const input = tel(host);
  input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
  input.value = next;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

/** Focus asks for the rules; whenReady() awaits the lazy chunk, no sleep or poll. */
async function withRules(host: MpPhoneInput): Promise<void> {
  tel(host).dispatchEvent(new Event('focus'));
  await settle(host);
}

function changes(host: MpPhoneInput): PhoneChangeEventDetail[] {
  const seen: PhoneChangeEventDetail[] = [];
  host.addEventListener('phonechange', (e) => seen.push((e as CustomEvent<PhoneChangeEventDetail>).detail));
  return seen;
}

describe('mp-phone-input', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one input group in the light DOM: picker, dial-code addon, tel input', async () => {
    const host = await mount({ defaultCountry: 'be' });
    expect(host.shadowRoot).toBeNull();
    const group = host.querySelector('.input-group')!;
    expect([...group.children].map((c) => c.tagName)).toEqual(['SELECT', 'SPAN', 'INPUT']);
    expect(picker(host).value).toBe('be');
    expect(host.querySelector('.dial-code')?.textContent?.trim()).toBe('+32');
    expect(host.querySelector('.dial-code')?.getAttribute('dir')).toBe('ltr');
    expect(host.value).toBeNull();
  });

  it('labels the picker name first, so native typeahead finds a country by name', async () => {
    const host = await mount({ defaultCountry: 'be', locale: 'en' });
    const be = picker(host).querySelector('option[value=be]')!;
    expect(be.textContent?.trim()).toMatch(/^Belgium \+32 \(BE\)$/);
  });

  it('formats as the user types once the rules load, and derives E.164 through the parser', async () => {
    const host = await mount({ defaultCountry: 'be' });
    const seen = changes(host);
    await withRules(host);
    type(host, '0470123456');
    await host.updateComplete;
    // The parser strips the trunk 0; a string rule would submit +320470123456.
    expect(host.value).toBe('+32470123456');
    expect(seen.at(-1)).toMatchObject({ value: '+32470123456', country: 'be', dialCode: '32', valid: true });
    type(host, '470123456');
    expect(tel(host).value).toBe('470 12 34 56');
  });

  it('reports valid: undefined until the rules have loaded', async () => {
    const host = await mount({ defaultCountry: 'be' });
    const seen = changes(host);
    type(host, '470');
    expect(seen[0]).toMatchObject({ nationalNumber: '470', valid: undefined, value: '+32470' });
  });

  it('rule 1: typing mid-number keeps the caret anchored to its digit', async () => {
    const host = await mount({ defaultCountry: 'be' });
    await withRules(host);
    type(host, '47012345');
    type(host, '470 912 34 5', 5);
    expect(tel(host).value).toBe('470 91 23 45');
    expect(tel(host).selectionStart).toBe(5);
  });

  it('rule 3: a rejected non-digit restores the value and the caret', async () => {
    const host = await mount({ defaultCountry: 'be' });
    await withRules(host);
    type(host, '470123456');
    tel(host).setSelectionRange(4, 4);
    tel(host).dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    tel(host).value = '470 a12 34 56';
    tel(host).setSelectionRange(5, 5);
    tel(host).dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(tel(host).value).toBe('470 12 34 56');
    expect(tel(host).selectionStart).toBe(4);
  });

  it('rule 4: Backspace after a separator deletes the digit behind it; Delete the one after', async () => {
    const host = await mount({ defaultCountry: 'be' });
    const seen = changes(host);
    await withRules(host);
    type(host, '470123456');
    tel(host).setSelectionRange(4, 4);
    const backspace = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    tel(host).dispatchEvent(backspace);
    expect(backspace.defaultPrevented).toBe(true);
    expect(seen.at(-1)?.nationalNumber).toBe('47123456');

    type(host, '470123456');
    tel(host).setSelectionRange(3, 3);
    tel(host).dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(seen.at(-1)?.nationalNumber).toBe('47023456');
  });

  it('rule 4: leaves a ranged Backspace and one over a digit to the browser', async () => {
    const host = await mount({ defaultCountry: 'be' });
    await withRules(host);
    type(host, '470123456');
    tel(host).setSelectionRange(0, 3);
    const ranged = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    tel(host).dispatchEvent(ranged);
    tel(host).setSelectionRange(2, 2);
    const overDigit = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    tel(host).dispatchEvent(overDigit);
    expect([ranged.defaultPrevented, overDigit.defaultPrevented]).toEqual([false, false]);
  });

  it('rule 5: never rewrites the value mid-composition, and reformats once at the end', async () => {
    const host = await mount({ defaultCountry: 'be' });
    await withRules(host);
    tel(host).dispatchEvent(new CompositionEvent('compositionstart'));
    type(host, '470123456');
    expect(tel(host).value).toBe('470123456');
    tel(host).dispatchEvent(new CompositionEvent('compositionend'));
    expect(tel(host).value).toBe('470 12 34 56');
  });

  it('rule 7: a digit past the last legal length is rejected, not de-formatted', async () => {
    const host = await mount({ defaultCountry: 'be' });
    await withRules(host);
    type(host, '470123456');
    type(host, '470 12 34 567');
    expect(tel(host).value).toBe('470 12 34 56');
    expect(host.value).toBe('+32470123456');
  });

  it('D17: switching country keeps the digits, reformats and re-validates', async () => {
    const host = await mount({ defaultCountry: 'be' });
    const seen = changes(host);
    await withRules(host);
    type(host, '470123456');
    host.country = 'nl';
    await settle(host);
    expect(seen.at(-1)).toMatchObject({ country: 'nl', nationalNumber: '470123456', valid: false, value: '+31470123456' });
  });

  it('D11: an international number switches the country and strips the code', async () => {
    const host = await mount({ defaultCountry: 'be' });
    const countries: string[] = [];
    host.addEventListener('countrychange', (e) => countries.push((e as CustomEvent<string>).detail));
    await withRules(host);
    // 7400 sits in no +44 area-code list (7911 would resolve to Guernsey).
    type(host, '+44 7400 123456');
    await settle(host);
    expect(countries).toEqual(['gb']);
    expect(host.country).toBe('gb');
    expect(picker(host).value).toBe('gb');
    expect(host.value).toBe('+447400123456');
  });

  it('D5a: a dial code the selected country shares never overwrites it', async () => {
    const host = await mount({ country: 'ax' }); // +358, shared with fi
    await withRules(host);
    type(host, '+358 41 2345678');
    expect(host.country).toBe('ax');
  });

  it('parses a written E.164 value into country and national digits, without reporting it back', async () => {
    const host = await mount();
    const seen: unknown[] = [];
    host.addEventListener('valuechange', (e) => seen.push((e as CustomEvent).detail));
    host.value = '+32470123456';
    await settle(host);
    expect(picker(host).value).toBe('be');
    expect(tel(host).value).toBe('470 12 34 56');
    expect(seen).toEqual([]);
  });

  it('D9: picking a country reports it and moves focus to the number field', async () => {
    const host = await mount({ defaultCountry: 'be' });
    const countries: string[] = [];
    host.addEventListener('countrychange', (e) => countries.push((e as CustomEvent<string>).detail));
    picker(host).value = 'nl';
    picker(host).dispatchEvent(new Event('change', { bubbles: true }));
    await settle(host);
    expect(countries).toEqual(['nl']);
    expect(host.country).toBe('nl');
    expect(document.activeElement).toBe(tel(host));
    expect(host.querySelector('.dial-code')?.textContent?.trim()).toBe('+31');
  });

  it('honours allowed and preferred countries, as arrays or comma strings', async () => {
    const host = await mount({ allowedCountries: 'nl, be', preferredCountries: ['nl'] });
    expect([...picker(host).options].map((o) => o.value)).toEqual(['nl', 'be']);
  });

  it('disables both the picker and the number field', async () => {
    const host = await mount({ disabled: true });
    expect([picker(host).disabled, tel(host).disabled]).toEqual([true, true]);
  });

  it('submits E.164 under name through a hidden input once live', async () => {
    const host = await mount({ name: 'phone', defaultCountry: 'be' });
    await withRules(host);
    type(host, '470123456');
    await host.updateComplete;
    expect(tel(host).hasAttribute('name')).toBe(false);
    const hidden = host.querySelector<HTMLInputElement>('input[type=hidden]')!;
    expect([hidden.name, hidden.value]).toEqual(['phone', '+32470123456']);
  });

  it('reports an invalid number to the form on the tel input', async () => {
    const host = await mount({ defaultCountry: 'be', required: true });
    expect(tel(host).required).toBe(true);
    await withRules(host);
    type(host, '12');
    expect(tel(host).validity.customError).toBe(true);
    type(host, '470123456');
    expect(tel(host).validity.customError).toBe(false);
  });

  it('names the number field, describes it by the dial code, and references the error while invalid', async () => {
    const host = await mount({ inputLabel: 'Mobile', countryLabel: 'Land', errorText: 'Wrong', invalid: true });
    const describedBy = tel(host).getAttribute('aria-describedby')!.split(' ');
    expect(tel(host).getAttribute('aria-label')).toBe('Mobile');
    expect(picker(host).getAttribute('aria-label')).toBe('Land');
    expect(document.getElementById(describedBy[0])?.classList.contains('addon')).toBe(true);
    expect(document.getElementById(describedBy[1])?.textContent?.trim()).toBe('Wrong');
    expect(tel(host).getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('.flag')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the selected flag from the one corpus chunk', async () => {
    const host = await mount({ defaultCountry: 'be' });
    expect(host.querySelector('.flag svg')).not.toBeNull();
  });

  it('focusInput() lands on the number field, not the picker (D13)', async () => {
    const host = await mount();
    host.focusInput();
    expect(document.activeElement).toBe(tel(host));
  });
});
