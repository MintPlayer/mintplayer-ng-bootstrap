<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{ color?: string }>();
</script>

<template>
  <div class="card-footer" :class="color ? 'text-bg-' + color : null" v-bind="$attrs">
    <slot />
  </div>
</template>
