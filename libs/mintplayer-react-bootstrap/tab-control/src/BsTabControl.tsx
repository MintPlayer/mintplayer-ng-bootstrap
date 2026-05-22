import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpTabControl } from '@mintplayer/web-components/tab-control';
/**
 * React wrapper for `<mp-tab-control>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpTabControl;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsTabControl = createComponent({
  react: React,
  tagName: 'mp-tab-control',
  elementClass: MpTabControl,
});
