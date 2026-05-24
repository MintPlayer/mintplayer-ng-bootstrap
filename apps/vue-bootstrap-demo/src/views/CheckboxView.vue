<script setup lang="ts">
import { BsCheckbox } from '@mintplayer/vue-bootstrap/checkbox';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<BsCheckbox>I agree to the terms</BsCheckbox>`;
</script>

<template>
  <div class="demo-page">
    <h1>Checkbox</h1>

    <section>
      <h2>With label</h2>
      <BsCheckbox>I agree to the terms</BsCheckbox>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
