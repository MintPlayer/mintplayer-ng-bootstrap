<script setup lang="ts">
// Side-effect-registers <mp-ribbon-color-picker> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-color-picker v-bind="$attrs">
    <slot />
  </mp-ribbon-color-picker>
</template>
