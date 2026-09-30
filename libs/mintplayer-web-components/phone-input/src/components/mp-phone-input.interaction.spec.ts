import { beforeEach, describe, expect, it } from 'vitest';
import './mp-phone-input';
import type { CountryChangeEventDetail, MpPhoneInput, PhoneChangeEventDetail } from './mp-phone-input';
import { isStackedWidth, STACK_THRESHOLD_PX } from './stack';

/**
 * Interaction paths the main spec does not drive: picking a country from the
 * inner select, IME composition, Delete and ranged edits, the property mirrors
 * and the validity the element reports to its form.
 */
async function mount(attrs = ''): Promise<MpPhoneInput> {
  document.body.innerHTML = `<mp-phone-input ${attrs}></mp-phone-input>`;
  const el = document.body.querySelector('mp-phone-input') as MpPhoneInput;
  await el.updateComplete;
  return el;
}

const telInput = (el: MpPhoneInput) => el.shadowRoot!.querySelector('input[type="tel"]') as HTMLInputElement;
const picker = (el: MpPhoneInput) => el.shadowRoot!.querySelector('mp-select') as HTMLElement;

function type(el: MpPhoneInput, nextValue: string): void {
  const input = telInput(el);
  input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
  input.value = nextValue;
  input.setSelectionRange(nextValue.length, nextValue.length);
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

async function withRules(el: MpPhoneInput): Promise<void> {
  telInput(el).dispatchEvent(new Event('focus'));
  await el.updateComplete;
}

function pick(el: MpPhoneInput, value: string | null): CustomEvent {
  const ev = new CustomEvent('value-change', { detail: { value }, bubbles: true, composed: true });
  picker(el).dispatchEvent(ev);
  return ev;
}

describe('mp-phone-input interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('picking a country', () => {
    it('switches country, announces country-change, and moves focus to the number field (D9)', async () => {
      const el = await mount('country="be"');
      const countries: CountryChangeEventDetail[] = [];
      el.addEventListener('country-change', (e) => countries.push((e as CustomEvent<CountryChangeEventDetail>).detail));

      pick(el, 'nl');
      await el.updateComplete;

      expect(el.country).toBe('nl');
      expect(el.getAttribute('country')).toBe('nl');
      expect(countries).toEqual([{ country: 'nl', dialCode: '31' }]);
      expect(el.shadowRoot!.activeElement).toBe(telInput(el));
    });

    it('does not let the inner select value-change escape as the phone value-change', async () => {
      const el = await mount('country="be"');
      const outer: PhoneChangeEventDetail[] = [];
      el.addEventListener('value-change', (e) => outer.push((e as CustomEvent<PhoneChangeEventDetail>).detail));

      pick(el, 'fr');
      await el.updateComplete;

      // Every event the host sees carries the phone detail shape, never the select's.
      expect(outer.length).toBeGreaterThan(0);
      expect(outer.every((d) => d.country === 'fr' && d.dialCode === '33')).toBe(true);
    });

    it('ignores a cleared pick: the country stays and no country-change fires', async () => {
      const el = await mount('country="be"');
      let fired = false;
      el.addEventListener('country-change', () => (fired = true));
      pick(el, null);
      await el.updateComplete;
      expect(el.country).toBe('be');
      expect(fired).toBe(false);
    });

    it('loads the picked country rules, so validity becomes known', async () => {
      const el = await mount('country="be"');
      type(el, '612345678');
      pick(el, 'nl');
      await el.updateComplete;
      expect(el.valid).toBe(true);
      expect(el.value).toBe('+31612345678');
    });
  });

  describe('IME composition (D10 rule 5)', () => {
    it('never rewrites the value mid-composition and reformats once on compositionend', async () => {
      const el = await mount('country="be"');
      await withRules(el);
      const input = telInput(el);

      input.dispatchEvent(new Event('compositionstart'));
      input.value = '470123456';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      expect(input.value).toBe('470123456');
      expect(el.nationalNumber).toBe('');

      input.dispatchEvent(new Event('compositionend'));
      expect(el.nationalNumber).toBe('470123456');
      expect(input.value).toBe('470 12 34 56');
    });
  });

  describe('deletion keys', () => {
    it('Delete on a separator removes the digit AFTER it', async () => {
      const el = await mount('country="be"');
      await withRules(el);
      type(el, '470123456'); // '470 12 34 56'
      const input = telInput(el);
      input.setSelectionRange(3, 3); // caret right before the space
      const ev = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
      input.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
      expect(el.nationalNumber).toBe('47023456');
    });

    it('leaves a ranged Backspace to the browser: a range always contains digits', async () => {
      const el = await mount('country="be"');
      await withRules(el);
      type(el, '470123456');
      const input = telInput(el);
      input.setSelectionRange(2, 5);
      const ev = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
      input.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
      expect(el.nationalNumber).toBe('470123456');
    });

    it('leaves Backspace over a digit, and other keys, to the browser', async () => {
      const el = await mount('country="be"');
      await withRules(el);
      type(el, '470123456');
      const input = telInput(el);
      input.setSelectionRange(2, 2);
      const back = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
      const letter = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
      input.dispatchEvent(back);
      input.dispatchEvent(letter);
      expect(back.defaultPrevented).toBe(false);
      expect(letter.defaultPrevented).toBe(false);
    });

    it('Backspace at the very start does nothing', async () => {
      const el = await mount('country="be"');
      await withRules(el);
      type(el, '470123456');
      const input = telInput(el);
      input.setSelectionRange(0, 0);
      const ev = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
      input.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
      expect(el.nationalNumber).toBe('470123456');
    });
  });

  describe('value property', () => {
    it('clears on an empty or whitespace value', async () => {
      const el = await mount('value="+32470123456"');
      el.value = '   ';
      await el.updateComplete;
      expect(el.value).toBeNull();
      expect(telInput(el).value).toBe('');
    });

    it('keeps the country and takes the digits of a non-international value', async () => {
      const el = await mount('country="be"');
      el.value = '0470 12-34-56';
      await el.updateComplete;
      expect(el.country).toBe('be');
      expect(el.nationalNumber).toBe('0470123456');
    });

    it('formRestore ignores non-string state (a File or FormData entry)', async () => {
      const el = await mount('value="+32470123456"');
      el.formRestore(new FormData());
      expect(el.nationalNumber).toBe('470123456');
    });
  });

  describe('property mirrors reach the inner controls', () => {
    it('forwards placeholder, autocomplete and the two labels', async () => {
      const el = await mount('country="be"');
      el.placeholder = '470 12 34 56';
      el.autocomplete = 'tel';
      el.inputLabel = 'Mobile';
      el.countryLabel = 'Land';
      await el.updateComplete;
      const input = telInput(el);
      expect(input.getAttribute('placeholder')).toBe('470 12 34 56');
      expect(input.getAttribute('autocomplete')).toBe('tel');
      expect(input.getAttribute('aria-label')).toBe('Mobile');
      expect(picker(el).getAttribute('input-label')).toBe('Land');
      expect([el.placeholder, el.autocomplete, el.inputLabel, el.countryLabel]).toEqual([
        '470 12 34 56',
        'tel',
        'Mobile',
        'Land',
      ]);

      el.placeholder = null;
      el.autocomplete = null;
      el.inputLabel = null;
      el.countryLabel = null;
      await el.updateComplete;
      expect(input.hasAttribute('placeholder')).toBe(false);
      expect(input.getAttribute('autocomplete')).toBe('tel-national');
      expect(input.getAttribute('aria-label')).toBe('Phone number');
      expect(picker(el).getAttribute('input-label')).toBe('Country');
    });

    it('lets the attributes drive the same mirrors, with defaults on removal', async () => {
      const el = await mount('country="be" placeholder="x" autocomplete="tel" input-label="In" country-label="C"');
      expect(telInput(el).getAttribute('placeholder')).toBe('x');
      expect(telInput(el).getAttribute('aria-label')).toBe('In');
      el.removeAttribute('autocomplete');
      el.removeAttribute('placeholder');
      await el.updateComplete;
      expect(telInput(el).getAttribute('autocomplete')).toBe('tel-national');
      expect(telInput(el).hasAttribute('placeholder')).toBe(false);
    });

    it('aria-label on the host outranks input-label', async () => {
      const el = await mount('country="be" input-label="In" aria-label="Host"');
      expect(telInput(el).getAttribute('aria-label')).toBe('Host');
    });

    it('defaultCountry reflects lowercased and a null removes it', async () => {
      const el = await mount();
      el.defaultCountry = ' NL ';
      await el.updateComplete;
      expect(el.getAttribute('default-country')).toBe('nl');
      expect(el.defaultCountry).toBe('nl');
      expect(el.country).toBe('nl');
      el.defaultCountry = null;
      expect(el.hasAttribute('default-country')).toBe(false);
    });

    it('preferred and allowed countries accept arrays or comma strings; empty means unrestricted', async () => {
      const el = await mount('locale="en-US"');
      el.allowedCountries = ' BE , nl,,fr';
      el.preferredCountries = ['FR'];
      await el.updateComplete;
      expect(el.allowedCountries).toEqual(['be', 'nl', 'fr']);
      expect(el.preferredCountries).toEqual(['fr']);
      const select = picker(el) as HTMLElement & { options: { value: string }[] };
      expect(select.options.map((o) => o.value)).toEqual(['fr', 'be', 'nl']);

      el.allowedCountries = '';
      el.preferredCountries = null;
      await el.updateComplete;
      expect(el.allowedCountries).toBeNull();
      expect(el.preferredCountries).toEqual([]);
      expect(select.options).toHaveLength(244);
    });

    it('the getters hand out copies, so a caller cannot mutate the element state', async () => {
      const el = await mount();
      el.allowedCountries = ['be', 'nl'];
      el.preferredCountries = ['nl'];
      el.allowedCountries!.push('fr');
      el.preferredCountries.push('fr');
      expect(el.allowedCountries).toEqual(['be', 'nl']);
      expect(el.preferredCountries).toEqual(['nl']);
    });

    it('locale localizes the country names, and re-setting it is a no-op', async () => {
      const el = await mount('country="be"');
      el.locale = 'nl-BE';
      await el.updateComplete;
      expect(el.locale).toBe('nl-BE');
      const select = picker(el) as HTMLElement & { options: { value: string; label: string }[] };
      expect(select.options.find((o) => o.value === 'be')?.label).toBe('België +32 (BE)');
      el.locale = 'nl-BE';
      expect(el.isUpdatePending).toBe(false);
      el.locale = null;
      expect(el.locale).toBeNull();
    });

    it('the locale attribute localizes the names too', async () => {
      const el = await mount('country="be" locale="fr-BE"');
      const select = picker(el) as HTMLElement & { options: { value: string; label: string }[] };
      expect(select.options.find((o) => o.value === 'be')?.label).toBe('Belgique +32 (BE)');
    });
  });

  describe('form validity', () => {
    /** jsdom's ElementInternals has no setValidity; record what the element reports. */
    function recordValidity(el: MpPhoneInput): ValidityStateFlags[] {
      const calls: ValidityStateFlags[] = [];
      const internals = (el as unknown as { internals: ElementInternals }).internals;
      (internals as unknown as { setValidity: (f: ValidityStateFlags) => void }).setValidity = (f) => calls.push(f);
      return calls;
    }

    it('reports valueMissing while a required field is empty, then clears it', async () => {
      const el = await mount('country="be"');
      const calls = recordValidity(el);
      el.setAttribute('required', '');
      await el.updateComplete;
      expect(calls.at(-1)).toEqual({ valueMissing: true, customError: false });
      expect(telInput(el).getAttribute('aria-required')).toBe('true');

      type(el, '470123456');
      await el.updateComplete;
      expect(calls.at(-1)?.valueMissing).toBe(false);
    });

    it('reports customError once the rules know the number is invalid', async () => {
      const el = await mount('country="be"');
      const calls = recordValidity(el);
      await withRules(el);
      type(el, '12');
      await el.updateComplete;
      expect(el.valid).toBe(false);
      expect(calls.at(-1)).toEqual({ valueMissing: false, customError: true });
    });

    it('shows error-text in the feedback node referenced by the input when invalid', async () => {
      const el = await mount('country="be" invalid');
      el.errorText = 'Wrong number';
      await el.updateComplete;
      expect(el.errorText).toBe('Wrong number');
      const input = telInput(el);
      const id = input.getAttribute('aria-errormessage')!;
      expect(el.shadowRoot!.getElementById(id)?.textContent).toContain('Wrong number');
      expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(id);
      expect(input.getAttribute('aria-invalid')).toBe('true');

      el.errorText = null;
      expect(el.errorText).toBeNull();
    });

    it('anchors validity on the inner tel input', async () => {
      const el = await mount('country="be"');
      expect(el.formValidityAnchor()).toBe(telInput(el));
    });
  });

  it('host focus() lands on the number field, not the country picker (D13)', async () => {
    const el = await mount('country="be"');
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(telInput(el));
  });
});

describe('isStackedWidth (PRD 12.4 (d))', () => {
  it('never stacks an unmeasured (0) width', () => {
    expect(isStackedWidth(0)).toBe(false);
  });

  it('stacks up to and including the container-query threshold', () => {
    expect(isStackedWidth(1)).toBe(true);
    expect(isStackedWidth(STACK_THRESHOLD_PX)).toBe(true);
    expect(isStackedWidth(STACK_THRESHOLD_PX + 1)).toBe(false);
  });
});
