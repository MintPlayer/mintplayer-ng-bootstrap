<script setup lang="ts">
import { ref } from 'vue';
import { BsDatepicker } from '@mintplayer/vue-bootstrap/datepicker';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const date = ref<Date | null>(null);

const SOURCE = `<BsDatepicker v-model="date" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Datepicker</h1>
    <p class="text-body-secondary">
      A readonly input + calendar popup. Internally composes
      <code>&lt;mp-calendar&gt;</code> via a default slot.
    </p>

    <section>
      <h2>Default</h2>
      <BsDatepicker v-model="date" />
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ date ? date.toISOString().slice(0, 10) : '—' }}</code>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
