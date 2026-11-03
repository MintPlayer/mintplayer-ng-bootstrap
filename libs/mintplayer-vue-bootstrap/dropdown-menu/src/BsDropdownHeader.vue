<script setup lang="ts">
// Renders a plain <li class="dropdown-header">, styled by the menu's scoped
// sheet. The label is the slot content.
defineOptions({ inheritAttrs: false });
</script>

<template>
  <li v-bind="$attrs" class="dropdown-header" data-mps="dropdown-menu">
    <slot />
  </li>
</template>
