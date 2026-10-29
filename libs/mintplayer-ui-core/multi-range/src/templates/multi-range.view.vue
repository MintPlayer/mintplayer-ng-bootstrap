<script setup lang="ts">
// The multi-range slider's markup, compiled into the Angular, React, Vue and
// Lit fronts (PRD #437 D10). `view` comes from connectMultiRange().
import type { MultiRangeView } from '@mintplayer/ui-core/multi-range';

defineProps<{ view: MultiRangeView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <div v-bind="view.track">
    <div v-for="fill in view.fills" :key="fill.key" v-bind="fill.bag" :style="fill.geometry"></div>
    <span v-for="thumb in view.thumbs" :key="thumb.key" v-bind="thumb.slot"><input v-bind="thumb.input"><span v-bind="thumb.tooltip" :style="thumb.position">{{ thumb.text }}</span></span>
  </div>
  </div>
</template>
