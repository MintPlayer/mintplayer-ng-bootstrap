import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpSelect, type SelectChangeEventDetail } from '@mintplayer/web-components/select';

/**
 * React wrapper for `<mp-select>`. Side-effect-registers the WC via the
 * import above. Typed props come from the `MpSelect` class fields; the
 * `events` map surfaces the WC's `value-change` CustomEvent as an idiomatic
 * React `onValueChange` prop with full detail typing.
 *
 * Consumers can either pass an `options` JS array prop or place `<option>`
 * children for the slot-mirror mode — both work through the same component
 * because slotted light-DOM children are forwarded by React unchanged.
 */
export const BsSelect = createComponent({
  react: React,
  tagName: 'mp-select',
  elementClass: MpSelect,
  events: {
    onValueChange: 'value-change' as EventName<CustomEvent<SelectChangeEventDetail>>,
  },
});
