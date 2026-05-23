<script setup lang="ts">
// Side-effect-registers <mp-card-subtitle> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card-subtitle v-bind="$attrs">
    <slot />
  </mp-card-subtitle>
</template>
