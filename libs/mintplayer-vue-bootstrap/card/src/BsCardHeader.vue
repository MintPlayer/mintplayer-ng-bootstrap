<script setup lang="ts">
// Side-effect-registers <mp-card-header> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card-header v-bind="$attrs">
    <slot />
  </mp-card-header>
</template>
