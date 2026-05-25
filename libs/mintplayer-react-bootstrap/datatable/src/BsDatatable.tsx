import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpDatatable,
  type RowEventDetail,
  type SortChangeEventDetail,
  type SelectionChangeEventDetail,
  type TreeFetchRequestDetail,
  type TreeRowExpandDetail,
  type TreeExpandedIdsChangeDetail,
} from '@mintplayer/web-components/datatable';

/**
 * React wrapper for `<mp-datatable>`. Side-effect-registers the WC via
 * the import above. The `events` map surfaces each CustomEvent the WC
 * dispatches as an idiomatic React `on*` prop with full detail typing.
 *
 * Note: complex props like `columns`, `data`, `expandedIds`, `idKey`,
 * and `childCountKey` are typed by the MpDatatable class fields. Set
 * them as JS objects via the React props; @lit/react forwards them as
 * properties (not attributes) so Sets/arrays/functions round-trip
 * correctly.
 *
 * Tree-mode lazy fetch: the WC emits `mp-datatable-fetch-request` when
 * it needs children for an expanded row (surfaced here as
 * `onFetchRequest`). The consumer resolves the request and calls
 * `setFetchResponse(parentId, response)` on the element ref to feed
 * the children back into the WC's cache.
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
    onFetchRequest: 'mp-datatable-fetch-request' as EventName<CustomEvent<TreeFetchRequestDetail>>,
    onRowExpand: 'mp-datatable-row-expand' as EventName<CustomEvent<TreeRowExpandDetail>>,
    onRowCollapse: 'mp-datatable-row-collapse' as EventName<CustomEvent<TreeRowExpandDetail>>,
    onExpandedIdsChange: 'mp-datatable-expanded-ids-change' as EventName<CustomEvent<TreeExpandedIdsChangeDetail>>,
  },
});
