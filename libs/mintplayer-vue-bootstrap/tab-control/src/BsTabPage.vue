<script setup lang="ts">
/**
 * One page of a `BsTabControl`. Renders nothing by itself: the control reads
 * its props and its `header` / default slots and renders every radio, tab and
 * pane as siblings, because the CSS pairs the n-th radio with the n-th pane.
 * The control also forwards the page's other attributes onto its pane.
 */
defineOptions({ inheritAttrs: false });
defineProps<{
  /** The page's identity in the control's `v-model`. Defaults to its position. */
  tabId?: string;
  disabled?: boolean;
}>();
defineSlots<{ header?: () => unknown; default?: () => unknown }>();
</script>

<template></template>
