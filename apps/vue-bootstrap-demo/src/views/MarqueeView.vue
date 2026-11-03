<script setup lang="ts">
import { BsMarquee } from '@mintplayer/vue-bootstrap/marquee';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<BsMarquee label="Greeting">Hello world</BsMarquee>`;
</script>

<template>
  <div class="demo-page">
    <h1>Marquee</h1>
    <p class="text-body-secondary">
      Scrolls its content horizontally. It pauses on hover, on focus and with its button (localise it
      with <code>pauseText</code> / <code>resumeText</code>), and stands still when the user prefers
      reduced motion. <code>label</code> names the ticker.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsMarquee label="Greeting">Hello world</BsMarquee>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
