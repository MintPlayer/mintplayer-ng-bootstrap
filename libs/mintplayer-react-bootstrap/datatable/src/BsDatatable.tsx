import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpDatatable,
  type RowEventDetail,
  type SortChangeEventDetail,
  type SelectionChangeEventDetail,
} from '@mintplayer/web-components/datatable';

/**
 * React wrapper for `<mp-datatable>`. Side-effect-registers the WC via
 * the import above. The `events` map surfaces each CustomEvent the WC
 * dispatches as an idiomatic React `on*` prop with full detail typing.
 *
 * Note: complex props like `columns` and `rows` are typed by the
 * MpDatatable class fields. Set them as JS objects via the spread/prop
 * APIs; @lit/react forwards them as properties (not attributes) so
 * arrays/functions/Maps round-trip correctly.
 */
export const BsDatatable = createComponent({
  react: React,
  tagName: 'mp-datatable',
  elementClass: MpDatatable,
  events: {
    onPageChange: 'mp-datatable-page-change' as EventName<CustomEvent<{ page: number }>>,
    onPerPageChange: 'mp-datatable-per-page-change' as EventName<CustomEvent<{ perPage: number }>>,
    onSortChange: 'mp-datatable-sort-change' as EventName<CustomEvent<SortChangeEventDetail>>,
    onRowClick: 'mp-datatable-row-click' as EventName<CustomEvent<RowEventDetail>>,
    onRowDblClick: 'mp-datatable-row-dblclick' as EventName<CustomEvent<RowEventDetail>>,
    onRowContextMenu: 'mp-datatable-row-contextmenu' as EventName<CustomEvent<RowEventDetail>>,
    onSelectionChange: 'mp-datatable-selection-change' as EventName<CustomEvent<SelectionChangeEventDetail>>,
  },
});
