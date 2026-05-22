<script setup lang="ts">
// Side-effect-registers <mp-treeview> via the upstream WC entry.
import '@mintplayer/web-components/treeview';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-treeview v-bind="$attrs">
    <slot />
  </mp-treeview>
</template>
