import { loadFlag, type CountryCode } from '@mintplayer/web-components/flags';
import { loadPhoneValidator, phoneCountries, type PhoneCountry } from '@mintplayer/web-components/phone-core';

const code: CountryCode = 'be';
export const first: PhoneCountry = phoneCountries[0];
export const svg = loadFlag(code);
export const validator = loadPhoneValidator();
