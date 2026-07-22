<script setup lang="ts">
// Renders a plain <li class="dropdown-divider">; the menu WC styles it via
// `::slotted(.dropdown-divider)`.
defineOptions({ inheritAttrs: false });
</script>

<template>
  <li v-bind="$attrs" role="separator" class="dropdown-divider" />
</template>
