<script setup lang="ts">
import '@mintplayer/web-components/dropdown-menu';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-dropdown-header v-bind="$attrs">
    <slot />
  </mp-dropdown-header>
</template>
