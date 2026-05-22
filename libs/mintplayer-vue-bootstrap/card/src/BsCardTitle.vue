<script setup lang="ts">
// Side-effect-registers <mp-card-title> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card-title v-bind="$attrs">
    <slot />
  </mp-card-title>
</template>
