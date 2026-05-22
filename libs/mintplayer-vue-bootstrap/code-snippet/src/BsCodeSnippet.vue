<script setup lang="ts">
// Side-effect-registers <mp-code-snippet> via the upstream WC entry.
import '@mintplayer/web-components/code-snippet';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-code-snippet v-bind="$attrs">
    <slot />
  </mp-code-snippet>
</template>
