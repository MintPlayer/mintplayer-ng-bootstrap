<script setup lang="ts">
import '@mintplayer/web-components/treeview';
import type {
  MpTreeview,
  TreeNode,
  TreeviewSelectionMode,
  TreeNodeRenderer,
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
  /**
   * Per-node body renderer. Returns a DOM node, which the WC mounts in its
   * (light-DOM) tree — so the page's stylesheets style it normally.
   * Exposed here for parity with the Angular and React wrappers.
   */
  nodeRenderer?: TreeNodeRenderer;
  /** Returns an HTML/SVG string for a node's icon. */
  iconResolver?: (node: TreeNode) => string | null | undefined;
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
// Function-valued props never survive attribute serialization — assign them
// to the element's JS properties, like `items`.
const syncRenderers = () => {
  if (!el.value) return;
  if (props.nodeRenderer !== undefined) el.value.nodeRenderer = props.nodeRenderer;
  if (props.iconResolver !== undefined) el.value.iconResolver = props.iconResolver;
};

onMounted(() => {
  syncItems();
  syncExpandedIds();
  syncSelectedIds();
  syncSelectionMode();
  syncRenderers();
});
watch(() => props.items, syncItems);
watch(expandedIds, syncExpandedIds);
watch(selectedIds, syncSelectedIds);
watch(() => props.selectionMode, syncSelectionMode);
watch(() => props.nodeRenderer, syncRenderers);
watch(() => props.iconResolver, syncRenderers);

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
