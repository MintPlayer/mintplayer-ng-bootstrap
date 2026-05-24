<script setup lang="ts">
import { ref } from 'vue';
import { BsMultiRange } from '@mintplayer/vue-bootstrap/multi-range';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const value = ref<number[]>([20, 60]);

const SOURCE = `<BsMultiRange v-model="value" :min="0" :max="100" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Multi-range</h1>
    <p class="text-body-secondary">
      A multi-thumb range slider. Thumbs cannot cross their neighbours;
      identity is by index. <code>value-input</code> fires continuously
      during drag, <code>value-change</code> on pointer release.
    </p>

    <section>
      <h2>Two-thumb range</h2>
      <BsMultiRange v-model="value" :min="0" :max="100" />
      <p class="text-body-secondary mt-2">
        Selected range: <code>[{{ value.join(', ') }}]</code>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
