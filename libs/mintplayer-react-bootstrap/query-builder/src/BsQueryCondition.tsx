import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpQueryConditionElement } from '@mintplayer/web-components/query-builder';
/**
 * React wrapper for `<mp-query-condition>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpQueryConditionElement;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsQueryCondition = createComponent({
  react: React,
  tagName: 'mp-query-condition',
  elementClass: MpQueryConditionElement,
});
