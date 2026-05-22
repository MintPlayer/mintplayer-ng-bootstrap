<script setup lang="ts">
// Side-effect-registers <mp-card-body> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card-body v-bind="$attrs">
    <slot />
  </mp-card-body>
</template>
