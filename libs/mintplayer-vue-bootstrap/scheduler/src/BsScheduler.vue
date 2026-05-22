<script setup lang="ts">
// Side-effect-registers <mp-scheduler> via the upstream WC entry.
import '@mintplayer/web-components/scheduler';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-scheduler v-bind="$attrs">
    <slot />
  </mp-scheduler>
</template>
