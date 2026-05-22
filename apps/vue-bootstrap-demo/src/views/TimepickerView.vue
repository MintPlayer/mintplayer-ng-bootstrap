<script setup lang="ts">
import { BsTimepicker } from '@mintplayer/vue-bootstrap/timepicker';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsTimepicker />";
</script>

<template>
  <div class="demo-page">
    <h1>Timepicker</h1>
    <section>
      <h2>Default</h2>
      <BsTimepicker />
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
