<script setup lang="ts">
import { BsDatetimePicker } from '@mintplayer/vue-bootstrap/datetime-picker';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
const SOURCE = "<BsDatetimePicker />";
</script>

<template>
  <div class="demo-page">
    <h1>Datetime picker</h1>
    <section>
      <h2>Default</h2>
      <BsDatetimePicker />
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
