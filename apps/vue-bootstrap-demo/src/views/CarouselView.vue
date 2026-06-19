<script setup lang="ts">
import { ref } from 'vue';
import {
  BsCarousel,
  type CarouselAnimation,
  type CarouselOrientation,
} from '@mintplayer/vue-bootstrap/carousel';
import { BsCheckbox } from '@mintplayer/vue-bootstrap/checkbox';
import { BsSelect } from '@mintplayer/vue-bootstrap/select';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const slides = ['deer', 'duck', 'leopard', 'lion', 'peacock', 'tiger'];

const animation = ref<CarouselAnimation>('slide');
const orientation = ref<CarouselOrientation>('horizontal');
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
          <BsSelect v-model="animation">
            <option value="slide">slide</option>
            <option value="fade">fade</option>
            <option value="none">none</option>
          </BsSelect>
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
        <label>
          Orientation
          <BsSelect v-model="orientation">
            <option value="horizontal">horizontal</option>
            <option value="vertical">vertical</option>
          </BsSelect>
        </label>
        <BsCheckbox v-model="indicators">Indicators</BsCheckbox>
        <span class="badge text-bg-secondary">index: {{ index }}</span>
        <span class="badge text-bg-secondary">{{ paused ? 'paused' : 'playing' }}</span>
      </div>

      <BsCarousel
        style="display: block; max-width: 500px; margin: 0 auto"
        :animation="animation"
        :orientation="orientation"
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
      <h2>Without JavaScript (server-rendered)</h2>
      <p class="text-body-secondary">
        These are the same, fully-interactive carousels as above — they're here to show they
        keep working with JavaScript <em>off</em>, served as ready-rendered HTML:
        <code>slide</code> degrades to a native scroll-snap strip, <code>fade</code> to a
        pure-CSS radio + dot machine (click a dot). To try it, open your browser's DevTools and
        toggle <em>Disable JavaScript</em> (<kbd>Ctrl/Cmd+Shift+P</kbd> → “Disable JavaScript”),
        then reload — browsers don't allow a page to link to that setting directly.
      </p>
      <div class="d-flex flex-wrap gap-4">
        <div>
          <h3 class="h6">Fade</h3>
          <BsCarousel
            animation="fade"
            indicators
            aria-label="Fade carousel"
            style="display: block; max-width: 320px"
          >
            <img v-for="name in slides" :key="name" :src="`/assets/resized/${name}.png`" :alt="name" />
          </BsCarousel>
        </div>
        <div>
          <h3 class="h6">Slide (scroll-snap)</h3>
          <BsCarousel
            animation="slide"
            aria-label="Slide carousel"
            style="display: block; max-width: 320px"
          >
            <img v-for="name in slides" :key="name" :src="`/assets/resized/${name}.png`" :alt="name" />
          </BsCarousel>
        </div>
      </div>
    </section>

    <section>
      <h2>Usage</h2>
      <BsCodeSnippet language="vue" :code="SOURCE" />
    </section>
  </div>
</template>
