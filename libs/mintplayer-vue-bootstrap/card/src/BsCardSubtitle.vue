<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div class="card-subtitle" v-bind="$attrs">
    <slot />
  </div>
</template>
