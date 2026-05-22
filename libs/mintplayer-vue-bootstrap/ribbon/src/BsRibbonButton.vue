<script setup lang="ts">
// Side-effect-registers <mp-ribbon-button> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-button v-bind="$attrs">
    <slot />
  </mp-ribbon-button>
</template>
