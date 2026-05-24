<script setup lang="ts">
import { ref } from 'vue';
import { BsDatetimePicker } from '@mintplayer/vue-bootstrap/datetime-picker';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const dt = ref<Date | null>(null);

const SOURCE = `<BsDatetimePicker v-model="dt" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Datetime picker</h1>
    <p class="text-body-secondary">
      Single readonly input with two popups — a calendar for the date,
      a time list for the hour/minute. Both share one <code>Date</code>
      value.
    </p>

    <section>
      <h2>Default</h2>
      <BsDatetimePicker v-model="dt" />
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ dt ? dt.toISOString() : '—' }}</code>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
