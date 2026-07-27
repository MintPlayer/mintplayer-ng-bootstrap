<script setup lang="ts">
// Registers <mp-carousel> on the client. On the SSR server this import runs
// after the lit-ssr DOM shim is installed (see the demo's entry-server.ts), so
// customElements.define doesn't throw in Node — same pattern as every other
// @mintplayer/vue-bootstrap wrapper.
import '@mintplayer/web-components/carousel';
import type {
  CarouselAnimation,
  CarouselOrientation,
  CarouselPausedChangeEventDetail,
  CarouselSlideChangeEventDetail,
  MpCarousel,
} from '@mintplayer/web-components/carousel';
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    animation?: CarouselAnimation;
    orientation?: CarouselOrientation;
    /** Show the indicator dots. */
    indicators?: boolean;
    /** Auto-advance interval in ms; omit for no autoplay. */
    interval?: number;
    /** Wrap around at the ends. */
    wrap?: boolean;
    /** Arrow/Home/End navigation on the focused viewport. */
    keyboardEvents?: boolean;
    /** Accessible label for the carousel region. */
    ariaLabel?: string;
  }>(),
  { animation: 'slide', orientation: 'horizontal', wrap: true, keyboardEvents: true },
);

/** Two-way: whether autoplay is paused (v-model:paused). */
const paused = defineModel<boolean>('paused', { default: false });

const emit = defineEmits<{
  slideChange: [detail: CarouselSlideChangeEventDetail];
  animationStart: [];
  animationEnd: [];
}>();

const el = ref<MpCarousel | null>(null);

function onSlideChange(event: Event) {
  emit('slideChange', (event as CustomEvent<CarouselSlideChangeEventDetail>).detail);
}
function onPausedChange(event: Event) {
  paused.value = (event as CustomEvent<CarouselPausedChangeEventDetail>).detail.paused;
}
function onAnimationStart() {
  emit('animationStart');
}
function onAnimationEnd() {
  emit('animationEnd');
}

// CustomEvents the WC dispatches; wired client-side only.
onMounted(() => {
  el.value?.addEventListener('slide-change', onSlideChange);
  el.value?.addEventListener('paused-change', onPausedChange);
  el.value?.addEventListener('animation-start', onAnimationStart);
  el.value?.addEventListener('animation-end', onAnimationEnd);
});
onBeforeUnmount(() => {
  el.value?.removeEventListener('slide-change', onSlideChange);
  el.value?.removeEventListener('paused-change', onPausedChange);
  el.value?.removeEventListener('animation-start', onAnimationStart);
  el.value?.removeEventListener('animation-end', onAnimationEnd);
});
</script>

<template>
  <mp-carousel
    ref="el"
    v-bind="$attrs"
    :animation="animation"
    :orientation="orientation"
    :indicators="indicators ? '' : undefined"
    :interval="interval && interval > 0 ? interval : undefined"
    :wrap="wrap === false ? 'false' : undefined"
    :keyboard-events="keyboardEvents === false ? 'false' : undefined"
    :paused="paused ? '' : undefined"
    :aria-label="ariaLabel"
  >
    <slot />
    <!-- Custom play/pause control: a native custom element needs the slot
         attribute on a REAL child (Vue template slot syntax can't provide it). -->
    <span v-if="$slots['play-pause']" slot="play-pause"><slot name="play-pause" /></span>
  </mp-carousel>
</template>
