// Shared by the S7 browser rig and the S8 Node script.
//
// THE FINDING THAT SHAPES THIS FILE (measured, see s8-logic.mjs "F1"):
// `new AsYouType(country).input(nationalDigits)` returns the digits UNFORMATTED
// for BE, NL, DE, FR, GB and most trunk-prefix countries, because libphonenumber's
// national `format` patterns are written against the number WITH its national
// prefix ("0470 12 34 56"). The PRD's design deliberately keeps the trunk prefix
// out of the editable value, so feeding the bare national significant number to
// AsYouType(country) formats nothing at all.
//
// The formatter that works for every country is: format the FULL international
// number and cut the calling code back off.
import { AsYouType } from 'libphonenumber-js/min';

/** Drop the first `ccDigits` digits of `formatted` plus any separators that follow them. */
export function stripCallingCode(formatted, ccDigits) {
  let seen = 0;
  let i = 0;
  for (; i < formatted.length && seen < ccDigits; i++) {
    if (/\d/.test(formatted[i])) seen++;
  }
  while (i < formatted.length && !/\d/.test(formatted[i])) i++;
  return formatted.slice(i);
}

/**
 * As-you-type formatting of the NATIONAL part only, for a control whose dial code
 * is static adjacent text (PRD D9). `dialCode` is the digits without '+'.
 */
export function formatNationalViaInternational(dialCode, nationalDigits) {
  if (!nationalDigits) return '';
  const full = new AsYouType().input(`+${dialCode}${nationalDigits}`);
  return stripCallingCode(full, dialCode.length);
}

/** The naive alternative, kept so the spike can show it produces nothing. */
export function formatNationalDirect(country, nationalDigits) {
  if (!nationalDigits) return '';
  return new AsYouType(country).input(nationalDigits);
}
