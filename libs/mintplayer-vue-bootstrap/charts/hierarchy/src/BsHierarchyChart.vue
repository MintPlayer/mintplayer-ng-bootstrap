<script setup lang="ts">
import '@mintplayer/web-components/charts/hierarchy';
import type {
  HierarchyChartLayout,
  HierarchyChildrenLoader,
  HierarchyNode,
  HierarchyNodeFormatter,
  MpHierarchyChart,
} from '@mintplayer/web-components/charts/hierarchy';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

// Scalars flow through as attributes via v-bind="$attrs" (layout, max-depth,
// color-min, locale, ...). Objects and functions can't — they're forwarded to
// the WC's property setters after mount. `root-id` is the two-way zoom state.
const props = defineProps<{
  data?: HierarchyNode;
  layout?: HierarchyChartLayout;
  loadChildren?: HierarchyChildrenLoader;
  tooltipFormatter?: HierarchyNodeFormatter;
  labelFormatter?: HierarchyNodeFormatter;
}>();
const rootId = defineModel<string | undefined>('rootId', { default: undefined });

const el = ref<MpHierarchyChart | null>(null);

// Per-property syncers: a `data` write rebuilds the WC's index (O(N)), so it
// must not re-fire on every zoom tick.
const syncData = () => {
  if (el.value) el.value.data = props.data;
};
const syncLayout = () => {
  if (el.value && props.layout) el.value.layout = props.layout;
};
const syncRootId = () => {
  if (el.value) el.value.rootId = rootId.value;
};
const syncLoadChildren = () => {
  if (el.value) el.value.loadChildren = props.loadChildren;
};
const syncTooltipFormatter = () => {
  if (el.value) el.value.tooltipFormatter = props.tooltipFormatter;
};
const syncLabelFormatter = () => {
  if (el.value) el.value.labelFormatter = props.labelFormatter;
};

onMounted(() => {
  syncData();
  syncLayout();
  syncRootId();
  syncLoadChildren();
  syncTooltipFormatter();
  syncLabelFormatter();
});
watch(() => props.data, syncData);
watch(() => props.layout, syncLayout);
watch(rootId, syncRootId);
watch(() => props.loadChildren, syncLoadChildren);
watch(() => props.tooltipFormatter, syncTooltipFormatter);
watch(() => props.labelFormatter, syncLabelFormatter);

function onZoom(e: Event) {
  rootId.value = (e.target as MpHierarchyChart).rootId;
}
</script>

<template>
  <mp-hierarchy-chart
    ref="el"
    v-bind="$attrs"
    @hierarchy-zoom="onZoom"
  />
</template>
