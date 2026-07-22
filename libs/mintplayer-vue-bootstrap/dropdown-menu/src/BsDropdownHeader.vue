<script setup lang="ts">
// Renders a plain <li class="dropdown-header">; the menu WC styles it via
// `::slotted(.dropdown-header)`. The label is the slotted content.
defineOptions({ inheritAttrs: false });
</script>

<template>
  <li v-bind="$attrs" class="dropdown-header">
    <slot />
  </li>
</template>
