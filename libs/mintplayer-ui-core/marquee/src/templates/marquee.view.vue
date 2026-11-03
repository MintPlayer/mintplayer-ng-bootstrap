<script setup lang="ts">
// The ticker: a named marquee region around the scrolling track, then the pause button.
import type { MarqueeView } from '@mintplayer/ui-core/marquee';

defineProps<{ view: MarqueeView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <span mp-host ref="root" v-bind="view.root">
    <span mp-attrs v-bind="view.region"><span v-bind="view.track"><slot /></span></span>
    <button v-bind="view.button">{{ view.buttonText }}</button>
  </span>
</template>
