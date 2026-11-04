<script setup lang="ts">
// The rating: one native radio per star, inside its star's label. The checked state is a property.
import type { RatingView } from '@mintplayer/ui-core/rating';

defineProps<{ view: RatingView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <label v-for="star in view.stars" :key="star.key" v-bind="star.star"><input v-bind="star.input" :checked.prop="star.checked" /><span aria-hidden="true">★</span></label>
  </div>
</template>
