import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MintMultiRangeElement } from '@mintplayer/web-components/multi-range';

/**
 * React wrapper for `<mp-multi-range>`. Side-effect-registers the WC via
 * the import above. Surfaces both events the WC emits — `value-input`
 * (continuous, fires on each thumb drag) and `value-change` (committed,
 * fires on pointer release).
 */
export const BsMultiRange = createComponent({
  react: React,
  tagName: 'mp-multi-range',
  elementClass: MintMultiRangeElement,
  events: {
    onValueInput: 'value-input' as EventName<CustomEvent<number[]>>,
    onValueChange: 'value-change' as EventName<CustomEvent<number[]>>,
  },
});
