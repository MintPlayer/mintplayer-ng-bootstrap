import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpTabPage } from '@mintplayer/web-components/tab-control';
/**
 * React wrapper for `<mp-tab-page>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpTabPage;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsTabPage = createComponent({
  react: React,
  tagName: 'mp-tab-page',
  elementClass: MpTabPage,
});
