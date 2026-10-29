<script setup lang="ts">
// The carousel's markup, compiled into the Angular, React, Vue and Lit fronts
// (PRD #437 D10). `view` comes from connectCarousel().
//
// The radios come before everything they drive: the stylesheet reaches the
// slides, indicators and control pairs through `:checked ~` sibling rules.
import type { CarouselView } from '@mintplayer/ui-core/carousel';

defineProps<{ view: CarouselView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-if="view.playPause" v-bind="view.playPause.wrap">
      <button v-bind="view.playPause.button"><span v-bind="view.playPause.icon"></span></button>
    </div>
    <input v-for="radio in view.radios" :key="radio.key" v-bind="radio.bag">
    <div v-bind="view.inner">
      <div v-bind="view.track">
        <slot></slot>
      </div>
    </div>
    <div v-if="view.indicators" v-bind="view.indicators.bag">
      <label v-for="item in view.indicators.items" :key="item.key" v-bind="item.bag"></label>
    </div>
    <div v-bind="view.controls.bag">
      <span v-for="pair in view.controls.pairs" :key="pair.key" v-bind="pair.pair"><label v-bind="pair.prev"><span v-bind="view.controls.icon.prev"></span></label><label v-bind="pair.next"><span v-bind="view.controls.icon.next"></span></label></span>
    </div>
  </div>
</template>
