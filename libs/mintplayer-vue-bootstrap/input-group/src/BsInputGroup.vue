<script setup lang="ts">
// Side-effect-registers <mp-input-group>.
import '@mintplayer/web-components/input-group';
defineOptions({ inheritAttrs: false });
</script>

<template>
  <!-- v-bind="$attrs" keeps the wrapper transparent: a consumer's `size`,
       aria-label, id or class lands on the element that acts on it. -->
  <mp-input-group v-bind="$attrs">
    <slot />
  </mp-input-group>
</template>
