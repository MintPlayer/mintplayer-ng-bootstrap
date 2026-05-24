<script setup lang="ts">
import '@mintplayer/web-components/treeview';
import type {
  MpTreeview,
  TreeNode,
  TreeviewSelectionMode,
} from '@mintplayer/web-components/treeview';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

// `items` is an array — Vue can't bind it via an attribute, so we forward
// via the WC's property setter after mount. `expanded-ids` / `selected-ids`
// flow through `defineModel` for v-model binding; the WC's
// `tree-node-expand` / `tree-node-select` events update them.
const props = defineProps<{
  items?: TreeNode[];
  selectionMode?: TreeviewSelectionMode;
}>();
const expandedIds = defineModel<string[]>('expandedIds', { default: () => [] });
const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] });

const el = ref<MpTreeview | null>(null);

// Per-property syncers — `items` triggers a full index rebuild inside the
// WC (O(N)), so we don't want to re-push it on every expand/select tick.
// Each watch fires only when its own dep changes.
const syncItems = () => {
  if (el.value) el.value.items = props.items ?? [];
};
const syncExpandedIds = () => {
  if (el.value) el.value.expandedIds = expandedIds.value;
};
const syncSelectedIds = () => {
  if (el.value) el.value.selectedIds = selectedIds.value;
};
const syncSelectionMode = () => {
  if (el.value) el.value.selectionMode = props.selectionMode ?? 'single';
};

onMounted(() => {
  syncItems();
  syncExpandedIds();
  syncSelectedIds();
  syncSelectionMode();
});
watch(() => props.items, syncItems);
watch(expandedIds, syncExpandedIds);
watch(selectedIds, syncSelectedIds);
watch(() => props.selectionMode, syncSelectionMode);

function onTreeNodeExpand(e: Event) {
  const d = (e as CustomEvent<{ expandedIds: string[] }>).detail;
  if (d) expandedIds.value = [...d.expandedIds];
}
function onTreeNodeCollapse(e: Event) {
  const d = (e as CustomEvent<{ expandedIds: string[] }>).detail;
  if (d) expandedIds.value = [...d.expandedIds];
}
function onTreeNodeSelect(e: Event) {
  const d = (e as CustomEvent<{ selectedIds: string[] }>).detail;
  if (d) selectedIds.value = [...d.selectedIds];
}
</script>

<template>
  <mp-treeview
    ref="el"
    v-bind="$attrs"
    @tree-node-expand="onTreeNodeExpand"
    @tree-node-collapse="onTreeNodeCollapse"
    @tree-node-select="onTreeNodeSelect"
  />
</template>
