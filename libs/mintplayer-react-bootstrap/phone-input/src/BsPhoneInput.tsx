import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpPhoneInput,
  type CountryChangeEventDetail,
  type PhoneChangeEventDetail,
} from '@mintplayer/web-components/phone-input';

/**
 * React wrapper for `<mp-phone-input>`: country picker with flags, a dial code
 * that cannot be edited away, and as-you-type formatting. `value` is E.164.
 *
 * Controlled usage is `value` + `onValueChange`, whose detail carries the
 * decomposed parts — `valid` is `undefined` until the selected country's rules
 * have loaded, which is deliberate rather than optimistic.
 *
 * ```tsx
 * <BsPhoneInput
 *   value={phone}
 *   defaultCountry="be"
 *   onValueChange={(e) => setPhone(e.detail.value)}
 * />
 * ```
 */
export const BsPhoneInput = createComponent({
  react: React,
  tagName: 'mp-phone-input',
  elementClass: MpPhoneInput,
  events: {
    onValueChange: 'value-change' as EventName<CustomEvent<PhoneChangeEventDetail>>,
    onCountryChange: 'country-change' as EventName<CustomEvent<CountryChangeEventDetail>>,
  },
});
