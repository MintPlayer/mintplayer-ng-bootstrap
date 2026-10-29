<script setup lang="ts">
import { ref } from 'vue';
import { BsMultiRange } from '@mintplayer/vue-bootstrap/multi-range';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const value = ref<number[] | null>([20, 60]);
const committed = ref<number[]>([20, 60]);
const three = ref<number[] | null>([2, 5, 8]);
const currency = (v: number) => `$${v.toFixed(2)}`;

const SOURCE = `<BsMultiRange
  v-model:value="value"
  aria-label="Price range"
  :min="0"
  :max="100"
  :format-value="(v) => '$' + v.toFixed(2)"
  @valuechange="committed = $event"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>Multi-range</h1>
    <p class="text-body-secondary">
      A slider with several thumbs; each thumb is a native range input, so the
      keyboard, RTL and form submission are the browser's own. Thumbs cannot
      cross their neighbours. <code>v-model:value</code> follows every move;
      <code>valuechange</code> fires when a move is committed.
    </p>

    <section>
      <h2>Two-thumb range</h2>
      <BsMultiRange
        v-model:value="value"
        aria-label="Price range"
        :min="0"
        :max="100"
        :format-value="currency"
        @valuechange="committed = $event"
      />
      <p class="text-body-secondary mt-2">
        Live: <code>[{{ value?.join(', ') }}]</code> · Committed: <code>[{{ committed.join(', ') }}]</code>
      </p>
    </section>

    <section>
      <h2>Three thumbs, half steps, a minimum gap of 1</h2>
      <BsMultiRange v-model:value="three" aria-label="Three thumbs" :min="0" :max="10" :step="0.5" :min-distance="1" />
      <p class="text-body-secondary mt-2">
        Selected: <code>[{{ three?.join(', ') }}]</code>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
