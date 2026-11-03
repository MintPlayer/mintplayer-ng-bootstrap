<script setup lang="ts">
// The parallax band: a decorative box whose custom properties carry the image and height.
import type { ParallaxView } from '@mintplayer/ui-core/parallax';

defineProps<{ view: ParallaxView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root"><div v-bind="view.band" :style="view.bandStyle"></div></div>
</template>
