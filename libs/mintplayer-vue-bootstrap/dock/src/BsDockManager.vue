<script setup lang="ts">
// Side-effect-registers <mint-dock-manager> via the upstream WC entry.
import '@mintplayer/web-components/dock';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mint-dock-manager v-bind="$attrs">
    <slot />
  </mint-dock-manager>
</template>
