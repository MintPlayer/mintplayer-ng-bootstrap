<script setup lang="ts">
import { BsFileManager } from '@mintplayer/vue-bootstrap/file-manager';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
const SOURCE = "<BsFileManager style=\"height: 400px\" />";
</script>

<template>
  <div class="demo-page">
    <h1>File manager</h1>
    <section>
      <h2>Default</h2>
      <BsFileManager style="height: 400px" />
        <p class="small text-body-secondary mt-2">Bind `:files.prop`.</p>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
