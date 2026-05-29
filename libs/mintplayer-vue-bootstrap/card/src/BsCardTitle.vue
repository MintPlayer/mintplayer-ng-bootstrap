<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div class="card-title" v-bind="$attrs">
    <slot />
  </div>
</template>
