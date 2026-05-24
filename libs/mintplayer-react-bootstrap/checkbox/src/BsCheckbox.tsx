import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpCheckbox, type CheckboxChangeEventDetail } from '@mintplayer/web-components/checkbox';

/**
 * React wrapper for `<mp-checkbox>`. Side-effect-registers the WC via
 * the import above. Typed props extend off MpCheckbox; the `events`
 * map surfaces the WC's CustomEvent dispatch as an idiomatic React
 * `onChange` prop with full detail typing.
 */
export const BsCheckbox = createComponent({
  react: React,
  tagName: 'mp-checkbox',
  elementClass: MpCheckbox,
  events: {
    onChange: 'change' as EventName<CustomEvent<CheckboxChangeEventDetail>>,
  },
});
