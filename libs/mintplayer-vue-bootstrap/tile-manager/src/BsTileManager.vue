<script setup lang="ts">
// Side-effect-registers <mp-tile-manager> via the upstream WC entry.
import '@mintplayer/web-components/tile-manager';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-tile-manager v-bind="$attrs">
    <slot />
  </mp-tile-manager>
</template>
