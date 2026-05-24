import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MpPagination, type PageChangeEventDetail } from '@mintplayer/web-components/pagination';
/**
 * React wrapper for `<mp-pagination>`. Side-effect-registers the WC via
 * the import above. The pagination WC fires its own custom event name
 * (`mp-pagination-page-change`); the `events` map below surfaces it as
 * an `onMpPaginationPageChange` typed React prop.
 */
export const BsPagination = createComponent({
  react: React,
  tagName: 'mp-pagination',
  elementClass: MpPagination,
  events: {
    onMpPaginationPageChange: 'mp-pagination-page-change' as EventName<CustomEvent<PageChangeEventDetail>>,
  },
});
