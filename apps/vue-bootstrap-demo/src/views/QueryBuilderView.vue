<script setup lang="ts">
import { BsQueryBuilder } from '@mintplayer/vue-bootstrap/query-builder';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsQueryBuilder />";
</script>

<template>
  <div class="demo-page">
    <h1>Query builder</h1>
    <section>
      <h2>Default</h2>
      <BsQueryBuilder />
        <p class="small text-body-secondary mt-2">Bind `:schema.prop` to enable field selection.</p>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
