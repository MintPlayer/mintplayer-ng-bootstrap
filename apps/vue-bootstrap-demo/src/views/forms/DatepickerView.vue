<script setup lang="ts">
import { ref } from 'vue';
import { BsDatepicker } from '@mintplayer/vue-bootstrap/datepicker';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const date = ref<Date | null>(new Date());

const SOURCE = `<BsDatepicker v-model:selected-date="date" name="date" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Datepicker</h1>
    <p class="text-body-secondary">
      A date field with a month-grid popup. With JavaScript off it is a native date field.
    </p>

    <section>
      <h2>Default</h2>
      <BsDatepicker v-model:selected-date="date" name="date" />
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ date ? date.toDateString() : 'none' }}</code>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
