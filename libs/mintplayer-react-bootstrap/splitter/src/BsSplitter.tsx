import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpSplitter } from '@mintplayer/web-components/splitter';
/**
 * React wrapper for `<mp-splitter>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpSplitter;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsSplitter = createComponent({
  react: React,
  tagName: 'mp-splitter',
  elementClass: MpSplitter,
});
