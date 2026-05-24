import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpToggleButton, type ToggleChangeEventDetail } from '@mintplayer/web-components/toggle-button';
/**
 * React wrapper for `<mp-toggle-button>`. Side-effect-registers the WC via
 * the import above. The WC fires a native-style `change` CustomEvent with
 * `{ checked, value }` detail; surface it as a typed `onChange` React prop.
 */
export const BsToggleButton = createComponent({
  react: React,
  tagName: 'mp-toggle-button',
  elementClass: MpToggleButton,
  events: {
    onChange: 'change' as EventName<CustomEvent<ToggleChangeEventDetail>>,
  },
});
