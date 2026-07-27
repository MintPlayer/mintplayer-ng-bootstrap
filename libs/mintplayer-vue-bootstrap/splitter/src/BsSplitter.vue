<script setup lang="ts">
import '@mintplayer/web-components/splitter';

defineOptions({ inheritAttrs: false });

// Splitter has no v-model — it manages panel sizes internally via
// divider drag + ResizeObserver, and emits resize-start / resizing /
// resize-end events the consumer can listen to with @resize-* (they
// pass through $attrs onto the inner <mp-splitter>). Configure via
// the orientation / min-panel-size / touch-mode attributes; for
// programmatic sizing take a template ref on the element and call
// getPanelSizes() / setPanelSizes() / resizeDividerBy().
</script>

<template>
  <mp-splitter v-bind="$attrs">
    <slot />
  </mp-splitter>
</template>
