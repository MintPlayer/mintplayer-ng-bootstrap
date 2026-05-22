<script setup lang="ts">
import { BsDatatable } from '@mintplayer/vue-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsDatatable />";
</script>

<template>
  <div class="demo-page">
    <h1>Datatable</h1>
    <section>
      <h2>Default</h2>
      <BsDatatable />
        <p class="small text-body-secondary mt-2">Bind `:columns.prop` and `:rows.prop`.</p>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
