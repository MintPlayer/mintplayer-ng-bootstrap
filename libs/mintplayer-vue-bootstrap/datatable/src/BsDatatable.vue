<script setup lang="ts">
// Side-effect-registers <mp-datatable> via the upstream WC entry.
import '@mintplayer/web-components/datatable';
import {
  MpDatatable,
  type DatatableColumnDef,
  type DatatableFetch,
  type RowKey,
  type DatatableSelectionMode,
  type TreeIdKey,
  type TreeSelectionStrategy,
  type TreeRowExpandDetail,
  type TreeExpandedIdsChangeDetail,
  type RowEventDetail,
  type SortChangeEventDetail,
  type SelectionChangeEventDetail,
} from '@mintplayer/web-components/datatable';
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

defineOptions({ inheritAttrs: false });

// Object-valued props (arrays, Sets, functions) must be assigned to the
// element's JS properties — Vue's attribute serialization can't carry them.
// Scalar props (`tree`, `virtualScroll`, `itemSize`, `selectionMode`, …)
// flow through `v-bind="$attrs"` on the template element.
const props = defineProps<{
  columns?: DatatableColumnDef[];
  data?: unknown[];
  /** Server-paged source. The WC owns the whole fetch loop; nothing else to wire. */
  fetch?: DatatableFetch | null;
  rowKey?: RowKey;
  // Tree-mode JS-property props
  tree?: boolean;
  idKey?: TreeIdKey | string | null;
  childCountKey?: string | null;
  treeIndent?: number;
  expandedIds?: Set<unknown> | ReadonlyArray<unknown>;
  selectionMode?: DatatableSelectionMode;
  selectionStrategy?: TreeSelectionStrategy;
  selectedIds?: string[] | ReadonlyArray<string>;
}>();

const emit = defineEmits<{
  (e: 'update:expandedIds', value: Set<unknown>): void;
  (e: 'update:selectedIds', value: string[]): void;
  (e: 'rowExpand', detail: TreeRowExpandDetail): void;
  (e: 'rowCollapse', detail: TreeRowExpandDetail): void;
  (e: 'sortChange', detail: SortChangeEventDetail): void;
  (e: 'selectionChange', detail: SelectionChangeEventDetail): void;
  (e: 'rowClick', detail: RowEventDetail): void;
  (e: 'rowDblClick', detail: RowEventDetail): void;
  (e: 'rowContextMenu', detail: RowEventDetail): void;
  (e: 'pageChange', detail: { page: number }): void;
  (e: 'perPageChange', detail: { perPage: number }): void;
}>();

const el = ref<MpDatatable | null>(null);

const syncProps = () => {
  if (!el.value) return;
  el.value.columns = (props.columns ?? []) as DatatableColumnDef[];
  // `fetch` and static `data` are mutually exclusive — when fetching, the WC
  // owns the rows, so don't also push `data` (it would clobber fetched pages).
  if (props.fetch != null) el.value.fetch = props.fetch;
  else el.value.data = props.data ?? [];
  if (props.rowKey !== undefined) el.value.rowKey = props.rowKey;
  if (props.tree !== undefined) el.value.tree = props.tree;
  if (props.idKey !== undefined) el.value.idKey = props.idKey as TreeIdKey | null;
  if (props.childCountKey !== undefined) el.value.childCountKey = props.childCountKey;
  if (props.treeIndent !== undefined) el.value.treeIndent = props.treeIndent;
  if (props.expandedIds !== undefined) {
    el.value.expandedIds = props.expandedIds instanceof Set
      ? new Set(props.expandedIds)
      : new Set(props.expandedIds);
  }
  if (props.selectionMode !== undefined) el.value.selectionMode = props.selectionMode;
  if (props.selectionStrategy !== undefined) el.value.selectionStrategy = props.selectionStrategy;
  if (props.selectedIds !== undefined) el.value.selectedIds = [...props.selectedIds];
};

// One handler per dispatched WC event; the WC's `mp-datatable-*` names
// flatten to camelCase Vue events. `update:expandedIds` is the v-model
// channel so `v-model:expandedIds` works on consumers.
const handlers: Record<string, (e: Event) => void> = {
  'mp-datatable-row-expand': (e) => emit('rowExpand', (e as CustomEvent<TreeRowExpandDetail>).detail),
  'mp-datatable-row-collapse': (e) => emit('rowCollapse', (e as CustomEvent<TreeRowExpandDetail>).detail),
  'mp-datatable-expanded-ids-change': (e) => {
    const detail = (e as CustomEvent<TreeExpandedIdsChangeDetail>).detail;
    emit('update:expandedIds', new Set(detail.expandedIds));
  },
  'mp-datatable-sort-change': (e) => emit('sortChange', (e as CustomEvent<SortChangeEventDetail>).detail),
  'mp-datatable-selection-change': (e) => {
    const detail = (e as CustomEvent<SelectionChangeEventDetail>).detail;
    emit('selectionChange', detail);
    emit('update:selectedIds', [...detail.selectedIds]);
  },
  'mp-datatable-row-click': (e) => emit('rowClick', (e as CustomEvent<RowEventDetail>).detail),
  'mp-datatable-row-dblclick': (e) => emit('rowDblClick', (e as CustomEvent<RowEventDetail>).detail),
  'mp-datatable-row-contextmenu': (e) => emit('rowContextMenu', (e as CustomEvent<RowEventDetail>).detail),
  'mp-datatable-page-change': (e) => emit('pageChange', (e as CustomEvent<{ page: number }>).detail),
  'mp-datatable-per-page-change': (e) => emit('perPageChange', (e as CustomEvent<{ perPage: number }>).detail),
};

const attachEvents = () => {
  if (!el.value) return;
  for (const [name, handler] of Object.entries(handlers)) {
    el.value.addEventListener(name, handler);
  }
};

const detachEvents = () => {
  if (!el.value) return;
  for (const [name, handler] of Object.entries(handlers)) {
    el.value.removeEventListener(name, handler);
  }
};

onMounted(() => {
  syncProps();
  attachEvents();
});

onBeforeUnmount(detachEvents);

watch(() => props.columns, syncProps, { deep: false });
watch(() => props.data, syncProps, { deep: false });
watch(() => props.fetch, syncProps);
watch(() => props.rowKey, syncProps);
watch(() => props.tree, syncProps);
watch(() => props.idKey, syncProps);
watch(() => props.childCountKey, syncProps);
watch(() => props.treeIndent, syncProps);
watch(() => props.expandedIds, syncProps, { deep: false });
watch(() => props.selectionMode, syncProps);
watch(() => props.selectionStrategy, syncProps);
watch(() => props.selectedIds, syncProps, { deep: false });

// The WC owns the fetch loop, so there are no imperative fetch methods to
// expose any more — just the underlying element for advanced access.
defineExpose({ el });
</script>

<template>
  <mp-datatable ref="el" v-bind="$attrs" />
</template>
