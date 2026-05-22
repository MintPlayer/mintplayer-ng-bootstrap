<script setup lang="ts">
// Side-effect-registers <mp-ribbon-toggle-button> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-toggle-button v-bind="$attrs">
    <slot />
  </mp-ribbon-toggle-button>
</template>
