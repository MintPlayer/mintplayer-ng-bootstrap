<script setup lang="ts">
import { BsRadio } from '@mintplayer/vue-bootstrap/radio';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
const SOURCE = "<BsRadio />";
</script>

<template>
  <div class="demo-page">
    <h1>Radio</h1>
    <section>
      <h2>Default</h2>
      <BsRadio />
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
