<script setup lang="ts">
// Side-effect-registers <mp-card> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card v-bind="$attrs">
    <slot />
  </mp-card>
</template>
