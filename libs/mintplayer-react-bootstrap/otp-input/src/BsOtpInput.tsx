import * as React from 'react';
import { createComponent } from '@lit/react';
import { MintOtpInputElement } from '@mintplayer/web-components/otp-input';
/**
 * React wrapper for `<mp-otp-input>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MintOtpInputElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsOtpInput = createComponent({
  react: React,
  tagName: 'mp-otp-input',
  elementClass: MintOtpInputElement,
});
