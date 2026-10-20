<script setup lang="ts">
import { computed } from 'vue';
import { cardImgClass, type CardImagePosition } from '@mintplayer/ui-core/card';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  position?: CardImagePosition;
  src?: string;
  alt?: string;
}>();

const imgClass = computed(() => cardImgClass(props.position));
</script>

<template>
  <template v-if="position === 'overlay'">
    <img class="card-img" :src="src" :alt="alt ?? ''" v-bind="$attrs" />
    <div class="card-img-overlay">
      <slot />
    </div>
  </template>
  <img v-else :class="imgClass" :src="src" :alt="alt ?? ''" v-bind="$attrs" />
</template>
