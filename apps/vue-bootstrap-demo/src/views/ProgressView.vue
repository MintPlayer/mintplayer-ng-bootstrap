<script setup lang="ts">
import { ref } from 'vue';
import { BsProgress, BsProgressBar } from '@mintplayer/vue-bootstrap/progress-bar';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const value = ref(40);

const SOURCE = `<script setup lang="ts">
import { BsProgress, BsProgressBar } from '@mintplayer/vue-bootstrap/progress-bar';
<\/script>

<template>
  <BsProgress>
    <BsProgressBar :value="15" label="Downloaded" />
    <BsProgressBar :value="30" color="warning" striped label="Queued" />
  </BsProgress>

  <BsProgress indeterminate label="Loading results" />
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Progress</h1>
    <p class="text-body-secondary">
      Each bar is a <code>role="progressbar"</code> named by <code>label</code>, with its value
      range on the role; <code>valueText</code> gives a human reading. Stacked bars each read on
      their own. <code>indeterminate</code> shows a bar of unknown progress (still under reduced
      motion).
    </p>

    <section>
      <h2>Single bar</h2>
      <BsProgress class="mb-2">
        <BsProgressBar :value="value" label="Upload" :value-text="`${value} percent`">{{ value }}%</BsProgressBar>
      </BsProgress>
      <input v-model.number="value" type="range" class="form-range" min="0" max="100" aria-label="Value" />
    </section>

    <section>
      <h2>Stacked, striped and animated</h2>
      <BsProgress>
        <BsProgressBar :value="15" label="Downloaded" />
        <BsProgressBar :value="30" color="warning" striped label="Queued" />
        <BsProgressBar :value="20" color="info" animated label="Processing" />
      </BsProgress>
    </section>

    <section>
      <h2>Indeterminate</h2>
      <BsProgress indeterminate :height="4" label="Loading results" />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
