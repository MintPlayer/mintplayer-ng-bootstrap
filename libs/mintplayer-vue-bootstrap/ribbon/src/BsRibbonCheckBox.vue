<script setup lang="ts">
// Side-effect-registers <mp-ribbon-checkbox> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-checkbox v-bind="$attrs">
    <slot />
  </mp-ribbon-checkbox>
</template>
