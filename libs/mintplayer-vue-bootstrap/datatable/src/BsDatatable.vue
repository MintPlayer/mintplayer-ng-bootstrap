<script setup lang="ts">
// Side-effect-registers <mp-datatable> via the upstream WC entry.
import '@mintplayer/web-components/datatable';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-datatable v-bind="$attrs">
    <slot />
  </mp-datatable>
</template>
