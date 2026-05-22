<script setup lang="ts">
import { ref } from 'vue';
import { BsDatepicker } from '@mintplayer/vue-bootstrap/datepicker';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const date = ref<Date | null>(new Date());

const SOURCE = `<script setup lang="ts">
import { ref } from 'vue';
import { BsDatepicker } from '@mintplayer/vue-bootstrap/datepicker';

const date = ref<Date | null>(new Date());
<\/script>

<template>
  <!-- v-model wired by the SFC adapter's defineModel() -->
  <BsDatepicker v-model="date" />
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Datepicker</h1>
    <p class="text-body-secondary">
      Calendar-driven date input. The Vue SFC adapter uses
      <code>defineModel()</code> internally so consumers get native
      <code>v-model</code> — the heavy lifting (set property + listen for
      change) happens inside the wrapper.
    </p>
    <section>
      <h2>v-model</h2>
      <BsDatepicker v-model="date" />
      <div class="mt-2 small text-body-secondary">
        Current value: <code>{{ date ? date.toISOString() : 'null' }}</code>
      </div>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
