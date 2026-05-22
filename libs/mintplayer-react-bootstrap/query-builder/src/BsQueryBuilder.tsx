import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpQueryBuilderElement } from '@mintplayer/web-components/query-builder';

/**
 * React wrapper for `<mp-query-builder>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpQueryBuilderElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsQueryBuilder = createComponent({
  react: React,
  tagName: 'mp-query-builder',
  elementClass: MpQueryBuilderElement,
});
