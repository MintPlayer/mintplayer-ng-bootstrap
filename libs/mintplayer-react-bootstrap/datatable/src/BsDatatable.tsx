import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  MpDatatable,
  type RowEventDetail,
  type SortChangeEventDetail,
  type SelectionChangeEventDetail,
  type TreeRowExpandDetail,
  type TreeExpandedIdsChangeDetail,
  type FilterChangeDetail,
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
 * consumer wires nothing else (no `totalRecords`, no event bridge). To
 * re-query with an unchanged callback, call `reload({ resetPage? })` on the
 * element ref; `applyFetchState({ fetch, sortColumns, page, perPage })` applies
 * several of those as one change (one request). Pass a stable `fetch`
 * (`useCallback`): a new function is a new source and reloads.
 *
 * Selection: `selectionMode` is `'none' | 'single' | 'multiple' | 'checkbox'`
 * (`'checkbox'` selects only through the checkbox column; a row click just
 * opens the row). Act on `onSelectionChange`'s `detail.selectedIds` — it is
 * authoritative and holds every selected key, across pages. `detail.selectedRows`
 * is index-aligned with it and covers every key whose row the element has ever
 * seen, off-page rows included; it is `undefined` where a key's row was never
 * seen, so narrow before use. The `selectedRows` prop REPLACES the selection
 * with the given rows (keys derived through `rowKey`, rows remembered even
 * when not loaded) and emits no event. `rowLabel: (row) => string` names each
 * row's checkbox ("Select {label}"); it defaults to the first cell's text.
 *
 * Filtering: mark a column `filterable` and it gets the built-in panel — search,
 * include/exclude, checkbox list, clear — with no wrapper code, because the
 * panel lives in the web component. `distincts` supplies the value lists when
 * the element does not hold every row; `onFilterChange` reports the selection,
 * which the consumer applies. A column's `filterRenderer` replaces the panel
 * entirely, and must return a STABLE node: it is mounted once per open, and
 * repainting it is the renderer's job via `context.onChange`.
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
    onFilterOpen: 'mp-datatable-filter-open' as EventName<CustomEvent<{ column: string }>>,
    onFilterClose: 'mp-datatable-filter-close' as EventName<CustomEvent<{ column: string }>>,
    onFilterChange: 'mp-datatable-filter-change' as EventName<CustomEvent<FilterChangeDetail>>,
  },
});
