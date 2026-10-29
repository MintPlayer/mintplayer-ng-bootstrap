<script setup lang="ts">
import { computed } from 'vue';
import { capColorClasses, type CardColor } from '@mintplayer/ui-core/card';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ color?: CardColor }>();

const classes = computed(() => ['card-footer', ...capColorClasses(props.color)]);
</script>

<template>
  <div :class="classes" v-bind="$attrs">
    <slot />
  </div>
</template>
