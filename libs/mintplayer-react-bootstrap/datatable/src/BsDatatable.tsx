import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpDatatable } from '@mintplayer/web-components/datatable';

/**
 * React wrapper for `<mp-datatable>`. Side-effect-registers the WC via
 * the import above. Typed props/events extend off MpDatatable;
 * hand-edit this file to add an `events: { onXxx: 'xxx' as EventName<...> }`
 * block if you need typed event listeners.
 */
export const BsDatatable = createComponent({
  react: React,
  tagName: 'mp-datatable',
  elementClass: MpDatatable,
});
