<script setup lang="ts">
// Side-effect-registers <mp-ribbon-contextual-tab-set> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon-contextual-tab-set v-bind="$attrs">
    <slot />
  </mp-ribbon-contextual-tab-set>
</template>
