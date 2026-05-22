<script setup lang="ts">
// Side-effect-registers <mp-ribbon-split-button> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-split-button v-bind="$attrs">
    <slot />
  </mp-ribbon-split-button>
</template>
