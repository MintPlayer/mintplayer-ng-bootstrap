<script setup lang="ts">
// Side-effect-registers <mp-ribbon> via the upstream WC entry.
import '@mintplayer/web-components/ribbon';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-ribbon v-bind="$attrs">
    <slot />
  </mp-ribbon>
</template>
