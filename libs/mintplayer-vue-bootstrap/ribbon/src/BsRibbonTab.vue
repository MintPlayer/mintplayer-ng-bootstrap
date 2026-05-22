<script setup lang="ts">
// Side-effect-registers <mp-ribbon-tab> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-tab v-bind="$attrs">
    <slot />
  </mp-ribbon-tab>
</template>
