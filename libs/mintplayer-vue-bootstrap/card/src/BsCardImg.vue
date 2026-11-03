<script setup lang="ts">
import { installBootstrap } from '@mintplayer/ui-core/bootstrap';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';
import { computed } from 'vue';
import { cardImgClass, type CardImagePosition } from '@mintplayer/ui-core/card';

// #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
installBootstrap(bootstrapCard);

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
    <img data-mps="card" class="card-img" :src="src" :alt="alt ?? ''" v-bind="$attrs" />
    <div data-mps="card" class="card-img-overlay">
      <slot />
    </div>
  </template>
  <img data-mps="card" v-else :class="imgClass" :src="src" :alt="alt ?? ''" v-bind="$attrs" />
</template>
