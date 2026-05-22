<script setup lang="ts">
// Side-effect-registers <mp-time-list> via the upstream WC entry.
import '@mintplayer/web-components/timepicker';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-time-list v-bind="$attrs">
    <slot />
  </mp-time-list>
</template>
