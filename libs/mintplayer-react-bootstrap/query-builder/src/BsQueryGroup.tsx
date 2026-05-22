import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpQueryGroupElement } from '@mintplayer/web-components/query-builder';

/**
 * React wrapper for `<mp-query-group>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpQueryGroupElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsQueryGroup = createComponent({
  react: React,
  tagName: 'mp-query-group',
  elementClass: MpQueryGroupElement,
});
