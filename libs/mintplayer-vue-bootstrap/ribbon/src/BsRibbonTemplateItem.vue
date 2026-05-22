<script setup lang="ts">
// Side-effect-registers <mp-ribbon-template-item> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-template-item v-bind="$attrs">
    <slot />
  </mp-ribbon-template-item>
</template>
