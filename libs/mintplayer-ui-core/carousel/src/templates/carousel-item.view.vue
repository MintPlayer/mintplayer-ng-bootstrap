<script setup lang="ts">
// One slide of a carousel (PRD #437 D10). `view` comes from connectCarouselItem().
import type { CarouselItemView } from '@mintplayer/ui-core/carousel';

defineProps<{ view: CarouselItemView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <slot></slot>
  </div>
</template>
