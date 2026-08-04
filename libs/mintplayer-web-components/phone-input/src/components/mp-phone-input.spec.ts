import { beforeEach, describe, expect, it } from 'vitest';
import './mp-phone-input';
import type { MpPhoneInput, PhoneChangeEventDetail } from './mp-phone-input';

/**
 * Behavioural specs for the composite. The caret rules are exercised through
 * real event dispatch + selection APIs (jsdom implements both for text-like
 * inputs); the per-engine visual/typeahead behaviour was measured in the spikes
 * and lands in the demo e2e.
 */
async function mount(attrs = ''): Promise<MpPhoneInput> {
  document.body.innerHTML = `<mp-phone-input ${attrs}></mp-phone-input>`;
  const el = document.body.querySelector('mp-phone-input') as MpPhoneInput;
  await el.updateComplete;
  return el;
}

function telInput(el: MpPhoneInput): HTMLInputElement {
  return el.shadowRoot!.querySelector('input[type="tel"]') as HTMLInputElement;
}

/** Simulate the browser's beforeinput→(value mutation)→input sequence. */
function type(el: MpPhoneInput, nextValue: string, caret?: number): void {
  const input = telInput(el);
  input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
  input.value = nextValue;
  const at = caret ?? nextValue.length;
  input.setSelectionRange(at, at);
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

async function withRules(el: MpPhoneInput): Promise<void> {
  // First interaction wants the rules; poll rather than sleep — the first
  // dynamic import of libphonenumber's core is slow under a loaded runner.
  telInput(el).dispatchEvent(new Event('focus'));
  for (let i = 0; i < 200 && el.valid === undefined; i++) {
    type(el, '1');
    type(el, '');
    if (el.valid !== undefined) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  type(el, '');
  await el.updateComplete;
}

describe('mp-phone-input', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('starts empty: null value, nothing submitted', async () => {
    const el = await mount('country="be"');
    expect(el.value).toBeNull();
    expect(el.formValue()).toBeNull();
    expect(el.country).toBe('be');
  });

  it('derives E.164 through the parser once rules load, honest valid before', async () => {
    const el = await mount('country="be"');
    type(el, '0470123456');
    // Rules not loaded yet: naive join, flagged by valid === undefined.
    expect(el.valid).toBeUndefined();

    await withRules(el);
    type(el, '');
    type(el, '0470123456');
    await el.updateComplete;
    // The parser strips BE's trunk 0 — a string rule would submit +320470123456.
    expect(el.value).toBe('+32470123456');
    expect(el.valid).toBe(true);
  });

  it('formats as the user types once rules are loaded', async () => {
    const el = await mount('country="be"');
    await withRules(el);
    type(el, '470123456');
    expect(telInput(el).value).toBe('470 12 34 56');
  });

  it('D10 rule 1: typing mid-number keeps the caret anchored to its digit', async () => {
    const el = await mount('country="be"');
    await withRules(el);
    type(el, '47012345');
    const input = telInput(el);
    // '470 12 34 5' — insert a 9 after '470 ' (index 4 → digits before = 3).
    input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    input.value = '470 912 34 5';
    input.setSelectionRange(5, 5); // after the inserted 9 = 4 digits
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(input.value).toBe('470 91 23 45');
    // Caret sits after the 4th digit, wherever formatting moved it: '470 9|1 …'.
    expect(input.selectionStart).toBe(5);
  });

  it('D10 rule 3: a rejected non-digit restores value AND caret', async () => {
    const el = await mount('country="be"');
    await withRules(el);
    type(el, '470123456');
    const input = telInput(el);
    input.setSelectionRange(4, 4);
    input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    input.value = '470 a12 34 56';
    input.setSelectionRange(5, 5);
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(input.value).toBe('470 12 34 56');
    expect(input.selectionStart).toBe(4);
    expect(el.nationalNumber).toBe('470123456');
  });

  it('D10 rule 4: Backspace on a separator deletes the digit behind it', async () => {
    const el = await mount('country="be"');
    await withRules(el);
    type(el, '470123456'); // '470 12 34 56'
    const input = telInput(el);
    input.setSelectionRange(4, 4); // caret right after the space
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    // The 0 died, not the space; digits are now 47123456.
    expect(el.nationalNumber).toBe('47123456');
    // One keypress, one digit — the control must never read as stuck.
    expect(input.value).not.toBe('470 12 34 56');
  });

  it('D10 rule 7: a digit past the last legal length is rejected, not de-formatted', async () => {
    const el = await mount('country="be"');
    await withRules(el);
    type(el, '470123456'); // complete BE mobile
    const input = telInput(el);
    input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    input.value = '470 12 34 567';
    input.setSelectionRange(13, 13);
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(input.value).toBe('470 12 34 56');
    expect(el.nationalNumber).toBe('470123456');
  });

  it('D17: switching country keeps the digits, reformats, re-validates', async () => {
    const el = await mount('country="be"');
    await withRules(el);
    type(el, '470123456');
    expect(el.valid).toBe(true);

    el.country = 'nl';
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;
    // Digits survived the switch; validity legitimately flipped; E.164 is NL's.
    expect(el.nationalNumber).toBe('470123456');
    expect(el.valid).toBe(false);
    expect(el.value).toBe('+31470123456');
  });

  it('D11: pasting an international number switches country and strips the code', async () => {
    const el = await mount('country="be"');
    await withRules(el);
    let detail: PhoneChangeEventDetail | undefined;
    el.addEventListener('value-change', (ev) => (detail = (ev as CustomEvent<PhoneChangeEventDetail>).detail));
    // 7400 sits in no +44 area-code list; 7911 would legitimately resolve to
    // Guernsey (gg enumerates it), which a first draft of this spec got wrong.
    type(el, '+44 7400 123456');
    await new Promise((r) => setTimeout(r, 50));
    expect(el.country).toBe('gb');
    expect(el.nationalNumber).toBe('7400123456');
    expect(detail?.country).toBe('gb');
  });

  it('D11/D5a: a compatible dial code never overwrites the selected sibling', async () => {
    const el = await mount('country="ax"'); // shares +358 with fi, fi has priority
    await withRules(el);
    type(el, '+358 41 2345678');
    expect(el.country).toBe('ax');
  });

  it('parses an E.164 value into country + national digits', async () => {
    const el = await mount('value="+32470123456"');
    expect(el.country).toBe('be');
    expect(el.nationalNumber).toBe('470123456');
  });

  it('D12: disabled fans out to BOTH children as attributes, from either source', async () => {
    const el = await mount('country="be"');
    const select = el.shadowRoot!.querySelector('mp-select')!;
    expect(select.hasAttribute('disabled')).toBe(false);
    expect(telInput(el).disabled).toBe(false);

    // The fieldset path: the UA writes no attribute, only the callback fires.
    (el as unknown as { formDisabledCallback(d: boolean): void }).formDisabledCallback(true);
    await el.updateComplete;
    expect(select.hasAttribute('disabled')).toBe(true);
    expect(telInput(el).disabled).toBe(true);

    // A property write must not defeat it (the Angular setDisabledState shape).
    el.disabled = false;
    await el.updateComplete;
    expect(select.hasAttribute('disabled')).toBe(true);

    (el as unknown as { formDisabledCallback(d: boolean): void }).formDisabledCallback(false);
    await el.updateComplete;
    expect(select.hasAttribute('disabled')).toBe(false);
  });

  it('formReset clears the digits; formRestore re-parses E.164 (D15)', async () => {
    const el = await mount('country="be"');
    type(el, '470123456');
    (el as unknown as { formResetCallback(): void }).formResetCallback();
    await el.updateComplete;
    expect(el.value).toBeNull();

    el.formRestore('+32470123456');
    await el.updateComplete;
    expect(el.country).toBe('be');
    expect(el.nationalNumber).toBe('470123456');
  });

  it('feeds the picker name-first labels — ISO-first kills native typeahead', async () => {
    const el = await mount('country="be" locale="en-US"');
    const select = el.shadowRoot!.querySelector('mp-select') as HTMLElement & { options: { label: string }[] | null };
    const be = select.options?.find((o) => /\+32/.test(o.label));
    expect(be?.label).toBe('Belgium +32 (BE)');
  });

  it('honours allowed-countries and preferred-countries', async () => {
    const el = await mount('allowed-countries="be,nl,fr" preferred-countries="nl" locale="en-US"');
    const select = el.shadowRoot!.querySelector('mp-select') as HTMLElement & { options: { value: string }[] | null };
    expect(select.options?.map((o) => o.value)).toEqual(['nl', 'be', 'fr']);
  });
});
