<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div class="card-text" v-bind="$attrs">
    <slot />
  </div>
</template>
