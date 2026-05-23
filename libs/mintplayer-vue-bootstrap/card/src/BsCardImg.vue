<script setup lang="ts">
// Side-effect-registers <mp-card-img> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card-img v-bind="$attrs">
    <slot />
  </mp-card-img>
</template>
