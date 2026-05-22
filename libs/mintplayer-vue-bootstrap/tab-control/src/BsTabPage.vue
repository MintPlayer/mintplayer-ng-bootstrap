<script setup lang="ts">
// Side-effect-registers <mp-tab-page> via the upstream WC entry.
import '@mintplayer/web-components/tab-control';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-tab-page v-bind="$attrs">
    <slot />
  </mp-tab-page>
</template>
