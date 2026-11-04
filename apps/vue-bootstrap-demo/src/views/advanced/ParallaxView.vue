<script setup lang="ts">
import { BsParallax } from '@mintplayer/vue-bootstrap/parallax';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const FILLER = [0, 1, 2, 3, 4, 5];
const SOURCE = `<BsParallax image="/assets/resized/lion.png" :height="300" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Parallax</h1>
    <p class="text-body-secondary">
      A decorative band whose background <code>image</code> stays fixed while the page scrolls past
      it. Under reduced motion it scrolls along with the page.
    </p>

    <section>
      <h2>Basic usage</h2>
      <p v-for="i in FILLER" :key="`a${i}`">Scroll down to see the image stay in place.</p>
      <BsParallax image="/assets/resized/lion.png" :height="300" />
      <p v-for="i in FILLER" :key="`b${i}`">Keep scrolling.</p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
