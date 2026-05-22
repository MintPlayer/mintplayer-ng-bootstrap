import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpScheduler } from '@mintplayer/web-components/scheduler';

/**
 * React wrapper for `<mp-scheduler>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpScheduler;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsScheduler = createComponent({
  react: React,
  tagName: 'mp-scheduler',
  elementClass: MpScheduler,
});
