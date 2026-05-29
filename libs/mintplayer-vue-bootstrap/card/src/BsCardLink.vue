<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{ href?: string }>();
</script>

<template>
  <a class="card-link" :href="href" v-bind="$attrs">
    <slot />
  </a>
</template>
