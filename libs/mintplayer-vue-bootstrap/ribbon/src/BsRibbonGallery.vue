<script setup lang="ts">
// Side-effect-registers <mp-ribbon-gallery> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-gallery v-bind="$attrs">
    <slot />
  </mp-ribbon-gallery>
</template>
