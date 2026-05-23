<script setup lang="ts">
// Side-effect-registers <mp-card-link> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card-link v-bind="$attrs">
    <slot />
  </mp-card-link>
</template>
