<script setup lang="ts">
// Side-effect-registers <mp-file-manager> via the upstream WC entry.
import '@mintplayer/web-components/file-manager';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-file-manager v-bind="$attrs">
    <slot />
  </mp-file-manager>
</template>
