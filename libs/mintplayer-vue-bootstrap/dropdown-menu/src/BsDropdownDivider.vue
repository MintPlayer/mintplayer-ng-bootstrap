<script setup lang="ts">
// Renders a plain <li class="dropdown-divider">, styled by the menu's scoped sheet.
defineOptions({ inheritAttrs: false });
</script>

<template>
  <li v-bind="$attrs" role="separator" class="dropdown-divider" />
</template>
