<script setup lang="ts">
// Side-effect-registers <mp-splitter> via the upstream WC entry.
import '@mintplayer/web-components/splitter';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-splitter v-bind="$attrs">
    <slot />
  </mp-splitter>
</template>
