<script setup lang="ts">
// Side-effect-registers <mp-ribbon-group> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-group v-bind="$attrs">
    <slot />
  </mp-ribbon-group>
</template>
