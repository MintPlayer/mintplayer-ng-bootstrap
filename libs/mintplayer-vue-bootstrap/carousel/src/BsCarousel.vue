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
import { onMounted, ref, watch } from 'vue';

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
    @slide-change="onSlideChange"
    @paused-change="onPausedChange"
    @animation-start="emit('animationStart')"
    @animation-end="emit('animationEnd')"
  >
    <slot />
  </mp-carousel>
</template>
