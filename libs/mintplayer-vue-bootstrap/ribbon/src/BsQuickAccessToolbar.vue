<script setup lang="ts">
// Side-effect-registers <mp-quick-access-toolbar> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-quick-access-toolbar v-bind="$attrs">
    <slot />
  </mp-quick-access-toolbar>
</template>
