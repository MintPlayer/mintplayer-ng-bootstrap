<script setup lang="ts">
import '@mintplayer/web-components/dropdown-menu';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <mp-dropdown-divider v-bind="$attrs" />
</template>
