<script setup lang="ts">
import '@mintplayer/web-components/splitter';

defineOptions({ inheritAttrs: false });

// Splitter has no v-model — it manages panel sizes internally via
// gutter drag + ResizeObserver, and emits resize-start / resizing /
// resize-end events the consumer can listen to with @resize-* on the
// inner <mp-splitter>. Consumers wanting two-way panel-size binding
// can pass `:panels="[{ size: ... }]"` and listen to @resize-end.
</script>

<template>
  <mp-splitter v-bind="$attrs">
    <slot />
  </mp-splitter>
</template>
