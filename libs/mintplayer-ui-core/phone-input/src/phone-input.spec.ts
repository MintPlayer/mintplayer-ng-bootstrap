import { describe, expect, it } from 'vitest';
import { connectPhoneInput, countryCodes, phoneValue, pickerCountries, type PhoneInputOptions } from './phone-input';

const options = (patch: Partial<PhoneInputOptions> = {}): PhoneInputOptions => ({
  id: 'pi',
  countries: pickerCountries('en', [], ['be', 'nl']),
  country: 'be',
  digits: '',
  rules: undefined,
  flags: undefined,
  disabled: false,
  required: false,
  invalid: false,
  errorText: null,
  placeholder: null,
  autocomplete: 'tel-national',
  name: null,
  label: null,
  countryLabel: null,
  hydrated: true,
  rich: false,
  ...patch,
});

describe('connectPhoneInput', () => {
  it('stamps every node it renders, and selects the country', () => {
    const view = connectPhoneInput(options());
    expect([view.root, view.group, view.select, view.addon, view.input].every((bag) => bag['data-mps'] === undefined)).toBe(true);
    expect(view.options.map((o) => [o.key, o.bag['selected']])).toEqual([
      ['be', true],
      ['nl', false],
    ]);
    expect(view.options[0].label).toBe('Belgium +32 (BE)');
    expect(view.dialText).toBe('+32');
  });

  it('names both controls, defaults first, and describes the number by the dial code', () => {
    const plain = connectPhoneInput(options());
    expect([plain.input['aria-label'], plain.select['aria-label']]).toEqual(['Phone number', 'Country']);
    expect(plain.input['aria-describedby']).toBe('pi-dial');
    expect(plain.addon['id']).toBe('pi-dial');

    const named = connectPhoneInput(options({ label: 'Mobile', countryLabel: 'Land', invalid: true, errorText: 'Bad' }));
    expect([named.input['aria-label'], named.select['aria-label']]).toEqual(['Mobile', 'Land']);
    expect(named.input['aria-describedby']).toBe('pi-dial pi-error');
    expect(named.input['aria-errormessage']).toBe('pi-error');
    expect(named.feedback).toEqual({ attrs: { id: 'pi-error', class: 'invalid-feedback d-block' }, text: 'Bad' });
  });

  it('submits the typed text with JavaScript off, and E.164 through a hidden input once live', () => {
    const server = connectPhoneInput(options({ name: 'phone', hydrated: false, digits: '470123456' }));
    expect(server.input['name']).toBe('phone');
    expect(server.hidden).toBeNull();

    const live = connectPhoneInput(options({ name: 'phone', digits: '470123456' }));
    expect(live.input['name']).toBeNull();
    expect(live.hidden).toMatchObject({ type: 'hidden', name: 'phone', value: '+32470123456' });
  });

  it('renders the flags once loaded, the selected one in the addon', () => {
    const view = connectPhoneInput(options({ flags: { be: '<svg id="be"></svg>' } }));
    expect(view.flagHtml).toBe('<svg id="be"></svg>');
    expect(view.options.map((o) => o.flag)).toEqual(['<svg id="be"></svg>', '']);
    expect(view.flag['aria-hidden']).toBe('true');
  });
});

describe('helpers', () => {
  it('countryCodes takes arrays or comma strings, lowercased and trimmed', () => {
    expect(countryCodes(' BE, nl ,')).toEqual(['be', 'nl']);
    expect(countryCodes(['FR'])).toEqual(['fr']);
    expect(countryCodes(null)).toEqual([]);
  });

  it('phoneValue is null while empty, and the naive join before the rules load', () => {
    expect(phoneValue(undefined, 'be', '32', '')).toBeNull();
    expect(phoneValue(undefined, 'be', '32', '0470')).toBe('+320470');
  });

  it('pickerCountries caches each list and puts preferred countries first', () => {
    const list = pickerCountries('en', ['nl'], ['be', 'nl']);
    expect(list.map((c) => c.iso2)).toEqual(['nl', 'be']);
    expect(pickerCountries('en', ['nl'], ['be', 'nl'])).toBe(list);
  });
});
