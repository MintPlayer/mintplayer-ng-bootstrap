<script setup lang="ts">
// Side-effect-registers <mp-ribbon-combobox> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-combobox v-bind="$attrs">
    <slot />
  </mp-ribbon-combobox>
</template>
