<script setup lang="ts">
// Side-effect-registers <mp-ribbon-menu-separator> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-menu-separator v-bind="$attrs">
    <slot />
  </mp-ribbon-menu-separator>
</template>
