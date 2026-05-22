<script setup lang="ts">
// Side-effect-registers <mp-card-group> via the upstream WC entry.
import '@mintplayer/web-components/card';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-card-group v-bind="$attrs">
    <slot />
  </mp-card-group>
</template>
