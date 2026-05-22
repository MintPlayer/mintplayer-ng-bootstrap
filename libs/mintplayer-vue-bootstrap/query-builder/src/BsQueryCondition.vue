<script setup lang="ts">
// Side-effect-registers <mp-query-condition> via the upstream WC entry.
import '@mintplayer/web-components/query-builder';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-query-condition v-bind="$attrs">
    <slot />
  </mp-query-condition>
</template>
