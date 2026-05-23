<script setup lang="ts">
// Side-effect-registers <mp-card-text> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card-text v-bind="$attrs">
    <slot />
  </mp-card-text>
</template>
