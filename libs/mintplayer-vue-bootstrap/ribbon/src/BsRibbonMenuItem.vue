<script setup lang="ts">
// Side-effect-registers <mp-ribbon-menu-item> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-menu-item v-bind="$attrs">
    <slot />
  </mp-ribbon-menu-item>
</template>
