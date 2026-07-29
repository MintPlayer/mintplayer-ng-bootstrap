import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpRadioGroup, type RadioGroupChangeEventDetail } from '@mintplayer/web-components/radio-group';

/**
 * React wrapper for `<mp-radio-group>`. Put `<BsRadio>` children inside it
 * and the WC supplies what shadow roots keep the platform from providing:
 * one-of-N exclusivity, `role="radiogroup"`, the roving tab stop and arrow
 * move-and-select. `onGroupChange` fires for every selection — including
 * keyboard-driven ones, which produce NO per-radio `change` event (the WC
 * checks radios programmatically). `value` is a settable property.
 */
export const BsRadioGroup = createComponent({
  react: React,
  tagName: 'mp-radio-group',
  elementClass: MpRadioGroup,
  events: {
    onGroupChange: 'group-change' as EventName<CustomEvent<RadioGroupChangeEventDetail>>,
  },
});
