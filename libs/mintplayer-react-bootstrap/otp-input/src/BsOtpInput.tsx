import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MintOtpInputElement } from '@mintplayer/web-components/otp-input';

/**
 * React wrapper for `<mp-otp-input>`. Side-effect-registers the WC via
 * the import above. Surfaces both `value-change` (fires on every
 * character) and `complete` (fires once when every slot is filled).
 */
export const BsOtpInput = createComponent({
  react: React,
  tagName: 'mp-otp-input',
  elementClass: MintOtpInputElement,
  events: {
    onValueChange: 'value-change' as EventName<CustomEvent<string>>,
    onComplete: 'complete' as EventName<CustomEvent<string>>,
  },
});
