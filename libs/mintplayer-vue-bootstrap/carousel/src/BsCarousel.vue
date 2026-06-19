<script setup lang="ts">
// Side-effect-registers <mp-carousel> via the upstream WC entry.
import '@mintplayer/web-components/carousel';
import type {
  CarouselAnimation,
  CarouselOrientation,
  CarouselPausedChangeEventDetail,
  CarouselSlideChangeEventDetail,
  MpCarousel,
} from '@mintplayer/web-components/carousel';
import { computed, Comment, Fragment, onMounted, ref, Text, useSlots, watch, type VNode } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    orientation?: CarouselOrientation;
    animation?: CarouselAnimation;
    interval?: number | null;
    wrap?: boolean;
    indicators?: boolean;
    keyboardEvents?: boolean;
    ariaLabel?: string | null;
  }>(),
  {
    orientation: 'horizontal',
    animation: 'slide',
    interval: null,
    wrap: true,
    indicators: false,
    keyboardEvents: true,
    ariaLabel: null,
  },
);

// Two-way: `v-model:paused` and `v-model:index`. The WC is host-controlled, so
// we mirror its `paused-change` / `slide-change` back into the models.
const paused = defineModel<boolean>('paused', { default: false });
const index = defineModel<number>('index', { default: 0 });

const emit = defineEmits<{ animationStart: []; animationEnd: [] }>();

const el = ref<MpCarousel | null>(null);

// `slide-count` is a server-render hint: lit-ssr can't see slotted children, so
// injectMpCarouselDsd reads this attribute to size the no-JS fallback. Count the
// element/component vnodes in the default slot (flattening v-for fragments,
// skipping comment/text nodes). The WC recounts itself from slotchange once it
// upgrades, so a stale value only affects the no-JS render.
const slots = useSlots();
function countSlides(vnodes: VNode[] | undefined): number {
  return (vnodes ?? []).reduce((n, v) => {
    if (v.type === Fragment) return n + countSlides(v.children as VNode[]);
    if (v.type === Comment || v.type === Text) return n;
    return n + 1;
  }, 0);
}
const slideCount = computed(() => countSlides(slots.default?.()));

const syncConfig = () => {
  const e = el.value;
  if (!e) return;
  e.orientation = props.orientation;
  e.animation = props.animation;
  e.interval = props.interval ?? 0;
  e.wrap = props.wrap;
  e.indicators = props.indicators;
  e.keyboardEvents = props.keyboardEvents;
  if (props.ariaLabel != null) e.setAttribute('aria-label', props.ariaLabel);
  else e.removeAttribute('aria-label');
  e.paused = paused.value;
};

onMounted(() => {
  syncConfig();
  if (el.value) el.value.index = index.value;
});

watch(
  () => [
    props.orientation,
    props.animation,
    props.interval,
    props.wrap,
    props.indicators,
    props.keyboardEvents,
    props.ariaLabel,
  ],
  syncConfig,
);
watch(paused, (v) => {
  if (el.value) el.value.paused = v;
});
watch(index, (v) => {
  if (el.value && el.value.index !== v) el.value.index = v;
});

function onSlideChange(ev: Event) {
  index.value = (ev as CustomEvent<CarouselSlideChangeEventDetail>).detail.index;
}
function onPausedChange(ev: Event) {
  paused.value = (ev as CustomEvent<CarouselPausedChangeEventDetail>).detail.paused;
}
</script>

<template>
  <mp-carousel
    ref="el"
    v-bind="$attrs"
    :slide-count="slideCount"
    :animation="animation"
    :orientation="orientation"
    :aria-label="ariaLabel ?? undefined"
    @slide-change="onSlideChange"
    @paused-change="onPausedChange"
    @animation-start="emit('animationStart')"
    @animation-end="emit('animationEnd')"
  >
    <slot />
  </mp-carousel>
</template>
