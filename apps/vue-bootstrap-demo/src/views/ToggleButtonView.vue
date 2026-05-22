<script setup lang="ts">
import { BsToggleButton } from '@mintplayer/vue-bootstrap/toggle-button';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsToggleButton>Toggle me</BsToggleButton>";
</script>

<template>
  <div class="demo-page">
    <h1>Toggle button</h1>
    <section>
      <h2>Default</h2>
      <BsToggleButton>Toggle me</BsToggleButton>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
