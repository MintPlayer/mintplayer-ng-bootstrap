import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpPagination } from '@mintplayer/web-components/pagination';
/**
 * React wrapper for `<mp-pagination>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpPagination;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsPagination = createComponent({
  react: React,
  tagName: 'mp-pagination',
  elementClass: MpPagination,
});
