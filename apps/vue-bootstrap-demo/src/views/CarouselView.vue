<script setup lang="ts">
import { ref } from 'vue';
import { BsCarousel, type CarouselAnimation } from '@mintplayer/vue-bootstrap/carousel';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const slides = ['deer', 'duck', 'leopard', 'lion', 'peacock', 'tiger'];

const animation = ref<CarouselAnimation>('slide');
const vertical = ref(false);
const indicators = ref(true);
const interval = ref(4000);
const paused = ref(false);
const index = ref(0);

const SOURCE = `<script setup lang="ts">
import { ref } from 'vue';
import { BsCarousel } from '@mintplayer/vue-bootstrap/carousel';

const index = ref(0);
const paused = ref(false);
<\/script>

<template>
  <BsCarousel
    indicators
    :interval="4000"
    aria-label="Example carousel"
    v-model:index="index"
    v-model:paused="paused"
  >
    <img src="/a.jpg" alt="" />
    <img src="/b.jpg" alt="" />
    <img src="/c.jpg" alt="" />
  </BsCarousel>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Carousel</h1>
    <p class="text-body-secondary">
      Slide / fade / none transitions, horizontal &amp; vertical orientation, optional
      auto-advance with a pause control, indicators, swipe and keyboard. Renders
      identically across Angular / React / Vue from the same
      <code>&lt;mp-carousel&gt;</code> web component.
    </p>

    <section>
      <h2>Interactive</h2>
      <div class="d-flex flex-wrap gap-3 align-items-center mb-3">
        <label>
          Animation
          <select v-model="animation" class="form-select form-select-sm d-inline-block w-auto">
            <option value="slide">slide</option>
            <option value="fade">fade</option>
            <option value="none">none</option>
          </select>
        </label>
        <label>
          Interval (ms)
          <input
            v-model.number="interval"
            type="number"
            step="500"
            min="0"
            class="form-control form-control-sm d-inline-block w-auto"
          />
        </label>
        <label><input v-model="vertical" type="checkbox" /> Vertical</label>
        <label><input v-model="indicators" type="checkbox" /> Indicators</label>
        <span class="badge text-bg-secondary">index: {{ index }}</span>
        <span class="badge text-bg-secondary">{{ paused ? 'paused' : 'playing' }}</span>
      </div>

      <BsCarousel
        style="display: block; max-width: 500px; margin: 0 auto"
        :animation="animation"
        :orientation="vertical ? 'vertical' : 'horizontal'"
        :indicators="indicators"
        :interval="interval"
        aria-label="Example carousel"
        v-model:index="index"
        v-model:paused="paused"
      >
        <img v-for="name in slides" :key="name" :src="`/assets/resized/${name}.png`" :alt="name" />
      </BsCarousel>
    </section>

    <section>
      <h2>Usage</h2>
      <BsCodeSnippet language="vue" :code="SOURCE" />
    </section>
  </div>
</template>
