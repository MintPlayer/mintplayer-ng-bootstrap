<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  position?: 'top' | 'bottom' | 'overlay';
  src?: string;
  alt?: string;
}>();

const imgClass = computed(() => {
  switch (props.position) {
    case 'bottom':
      return 'card-img-bottom';
    case 'overlay':
      return 'card-img';
    case 'top':
    default:
      return 'card-img-top';
  }
});
</script>

<template>
  <template v-if="position === 'overlay'">
    <img class="card-img" :src="src" :alt="alt" v-bind="$attrs" />
    <div class="card-img-overlay">
      <slot />
    </div>
  </template>
  <img v-else :class="imgClass" :src="src" :alt="alt" v-bind="$attrs" />
</template>
