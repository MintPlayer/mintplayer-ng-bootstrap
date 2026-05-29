<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div class="card-body" v-bind="$attrs">
    <slot />
  </div>
</template>
