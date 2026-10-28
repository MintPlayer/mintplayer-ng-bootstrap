<script setup lang="ts">
import { ref } from 'vue';
import { BsCarousel, BsCarouselItem } from '@mintplayer/vue-bootstrap/carousel';
import type { CarouselAnimation, CarouselOrientation, CarouselSlideChangeEventDetail } from '@mintplayer/vue-bootstrap/carousel';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const animation = ref<CarouselAnimation>('slide');
const orientation = ref<CarouselOrientation>('horizontal');
const paused = ref(false);
const index = ref(0);

const IMAGES = [
  { src: '/assets/resized/deer.png', alt: 'A deer' },
  { src: '/assets/resized/duck.png', alt: 'A duck' },
  { src: '/assets/resized/leopard.png', alt: 'A leopard' },
  { src: '/assets/resized/lion.png', alt: 'A lion' },
  { src: '/assets/resized/peacock.png', alt: 'A peacock' },
  { src: '/assets/resized/tiger.png', alt: 'A tiger' },
];

function onSlideChange(detail: CarouselSlideChangeEventDetail) {
  index.value = detail.index;
}

const BASIC_SOURCE = `<BsCarousel indicators :interval="4000" v-model:paused="paused"
  aria-label="Animal photos" @slidechange="onSlideChange">
  <BsCarouselItem><img src="/assets/resized/deer.png" alt="A deer" /></BsCarouselItem>
  <BsCarouselItem><img src="/assets/resized/duck.png" alt="A duck" /></BsCarouselItem>
  <BsCarouselItem><img src="/assets/resized/lion.png" alt="A lion" /></BsCarouselItem>
</BsCarousel>`;
</script>

<template>
  <div class="demo-page">
    <h1>Carousel</h1>
    <p>
      <code>BsCarousel</code> is generated from the headless carousel core: each slide is a
      <code>BsCarouselItem</code>, with indicators, auto-advance, slide/fade animation
      in both orientations, touch swipe, keyboard support and a radio-driven no-JS tier.
    </p>

    <section>
      <h2>Basic</h2>
      <BsCarousel
        :animation="animation"
        :orientation="orientation"
        :indicators="true"
        :interval="4000"
        v-model:paused="paused"
        aria-label="Animal photos"
        @slidechange="onSlideChange"
      >
        <BsCarouselItem v-for="img of IMAGES" :key="img.src"><img :src="img.src" :alt="img.alt" /></BsCarouselItem>
      </BsCarousel>
      <div class="mt-2 d-flex gap-2 align-items-center justify-content-center">
        <label>
          Mode
          <select v-model="animation" class="form-select d-inline-block w-auto">
            <option value="slide">Slide</option>
            <option value="fade">Fade</option>
          </select>
        </label>
        <label>
          Orientation
          <select v-model="orientation" class="form-select d-inline-block w-auto">
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <span class="text-body-secondary">
          Slide: <code>{{ index + 1 }}</code> {{ paused ? '(paused)' : '' }}
        </span>
      </div>
      <BsCodeSnippet :code="BASIC_SOURCE" language="html" />
    </section>

    <section>
      <h2>Without JavaScript (server-rendered)</h2>
      <p class="text-body-secondary">
        Two independent carousels: with JS disabled each keeps its own radio-driven state.
      </p>
      <div class="nojs-pair">
        <BsCarousel animation="fade" :indicators="true" aria-label="Fade pair">
          <BsCarouselItem v-for="img of IMAGES.slice(0, 3)" :key="img.src"><img :src="img.src" :alt="img.alt" /></BsCarouselItem>
        </BsCarousel>
        <BsCarousel animation="slide" :indicators="true" aria-label="Slide pair">
          <BsCarouselItem v-for="img of IMAGES.slice(3)" :key="img.src"><img :src="img.src" :alt="img.alt" /></BsCarouselItem>
        </BsCarousel>
      </div>
    </section>
  </div>
</template>

<style scoped>
.nojs-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
</style>
