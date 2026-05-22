import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpQuickAccessToolbar } from '@mintplayer/web-components/ribbon';

/**
 * React wrapper for `<mp-quick-access-toolbar>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpQuickAccessToolbar;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsQuickAccessToolbar = createComponent({
  react: React,
  tagName: 'mp-quick-access-toolbar',
  elementClass: MpQuickAccessToolbar,
});
