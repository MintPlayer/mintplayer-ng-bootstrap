<script setup lang="ts">
// Side-effect-registers <mp-query-subquery> via the upstream WC entry.
import '@mintplayer/web-components/query-builder';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-query-subquery v-bind="$attrs">
    <slot />
  </mp-query-subquery>
</template>
