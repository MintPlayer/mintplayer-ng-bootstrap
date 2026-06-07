import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpDatatable,
  type RowEventDetail,
  type SortChangeEventDetail,
  type SelectionChangeEventDetail,
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
 * Server paging: set the `fetch` prop to a callback returning
 * `{ data, totalRecords }`. `createComponent` forwards it to the element's
 * `fetch` property, and the web component owns the whole loop — initial page,
 * on-demand windows, tree children, pagination, sort/perPage reloads. The
 * consumer wires nothing else (no `totalRecords`, no event bridge). Selected
 * row objects arrive on `onSelectionChange`'s `detail.selectedRows`.
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
    onRowExpand: 'mp-datatable-row-expand' as EventName<CustomEvent<TreeRowExpandDetail>>,
    onRowCollapse: 'mp-datatable-row-collapse' as EventName<CustomEvent<TreeRowExpandDetail>>,
    onExpandedIdsChange: 'mp-datatable-expanded-ids-change' as EventName<CustomEvent<TreeExpandedIdsChangeDetail>>,
  },
});
