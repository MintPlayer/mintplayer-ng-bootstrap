<script setup lang="ts">
import { ref } from 'vue';
import { BsTimepicker } from '@mintplayer/vue-bootstrap/timepicker';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const time = ref<Date | null>(new Date());

const SOURCE = `<BsTimepicker v-model:selected-time="time" name="time" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Timepicker</h1>
    <p class="text-body-secondary">
      A time field with a slot-list popup. With JavaScript off it is a native time field.
    </p>
    <section>
      <h2>Default</h2>
      <BsTimepicker v-model:selected-time="time" name="time" />
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ time ? time.toTimeString().slice(0, 5) : 'none' }}</code>
      </p>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
