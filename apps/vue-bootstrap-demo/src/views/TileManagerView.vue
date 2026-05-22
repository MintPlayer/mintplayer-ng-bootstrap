<script setup lang="ts">
import { BsTileManager } from '@mintplayer/vue-bootstrap/tile-manager';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsTileManager style=\"height: 400px\" />";
</script>

<template>
  <div class="demo-page">
    <h1>Tile manager</h1>
    <section>
      <h2>Default</h2>
      <BsTileManager style="height: 400px" />
        <p class="small text-body-secondary mt-2">Bind `:tiles.prop` for sample data.</p>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
