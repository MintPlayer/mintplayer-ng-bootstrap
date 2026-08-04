import { loadFlag, type CountryCode } from '@mintplayer/web-components/flags';
import {
  loadPhoneRules,
  phoneCountries,
  type PhoneCountry,
  type PhoneMetadataCountry,
  type PhoneRules,
} from '@mintplayer/web-components/phone-core';

const code: CountryCode = 'be';
const country: PhoneMetadataCountry = 'be';
export const first: PhoneCountry = phoneCountries[0];
export const svg = loadFlag(code);
export const rules: Promise<PhoneRules | undefined> = loadPhoneRules(country);
export const formatted = rules.then((r) => r?.format('470123456'));
export const kind = rules.then((r) => r?.type('470123456'));
