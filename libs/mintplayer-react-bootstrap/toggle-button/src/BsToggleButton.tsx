import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpToggleButton } from '@mintplayer/web-components/toggle-button';
/**
 * React wrapper for `<mp-toggle-button>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpToggleButton;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsToggleButton = createComponent({
  react: React,
  tagName: 'mp-toggle-button',
  elementClass: MpToggleButton,
});
