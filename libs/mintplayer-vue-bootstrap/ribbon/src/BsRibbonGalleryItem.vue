<script setup lang="ts">
// Side-effect-registers <mp-ribbon-gallery-item> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-gallery-item v-bind="$attrs">
    <slot />
  </mp-ribbon-gallery-item>
</template>
