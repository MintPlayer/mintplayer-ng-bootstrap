<script setup lang="ts">
import { BsMultiRange } from '@mintplayer/vue-bootstrap/multi-range';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsMultiRange />";
</script>

<template>
  <div class="demo-page">
    <h1>Multi-range</h1>
    <section>
      <h2>Default</h2>
      <BsMultiRange />
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
