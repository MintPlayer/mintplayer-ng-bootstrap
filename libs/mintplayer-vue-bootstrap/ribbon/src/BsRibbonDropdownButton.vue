<script setup lang="ts">
// Side-effect-registers <mp-ribbon-dropdown-button> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-dropdown-button v-bind="$attrs">
    <slot />
  </mp-ribbon-dropdown-button>
</template>
