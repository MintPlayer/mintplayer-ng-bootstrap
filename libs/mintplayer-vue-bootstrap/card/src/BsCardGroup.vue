<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div class="card-group" v-bind="$attrs">
    <slot />
  </div>
</template>
