<script setup lang="ts">
import { BsTreeview } from '@mintplayer/vue-bootstrap/treeview';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
const SOURCE = "<BsTreeview />";
</script>

<template>
  <div class="demo-page">
    <h1>Treeview</h1>
    <section>
      <h2>Default</h2>
      <BsTreeview />
        <p class="small text-body-secondary mt-2">Bind `:nodes.prop` for sample data.</p>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
