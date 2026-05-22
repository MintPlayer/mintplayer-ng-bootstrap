import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpQuerySubqueryElement } from '@mintplayer/web-components/query-builder';

/**
 * React wrapper for `<mp-query-subquery>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpQuerySubqueryElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsQuerySubquery = createComponent({
  react: React,
  tagName: 'mp-query-subquery',
  elementClass: MpQuerySubqueryElement,
});
