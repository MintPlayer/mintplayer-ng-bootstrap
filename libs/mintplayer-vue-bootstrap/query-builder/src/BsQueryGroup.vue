<script setup lang="ts">
// Side-effect-registers <mp-query-group> via the upstream WC entry.
import '@mintplayer/web-components/query-builder';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-query-group v-bind="$attrs">
    <slot />
  </mp-query-group>
</template>
