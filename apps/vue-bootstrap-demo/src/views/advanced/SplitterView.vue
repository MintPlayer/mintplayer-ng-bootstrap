<script setup lang="ts">
import { BsSplitter } from '@mintplayer/vue-bootstrap/splitter';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<BsSplitter direction="horizontal" style="height: 240px">
  <div>Left pane</div>
  <div>Right pane</div>
</BsSplitter>`;
</script>

<template>
  <div class="demo-page">
    <h1>Splitter</h1>
    <p class="text-body-secondary">
      A draggable gutter between two (or more) panels. Pointer events
      from <code>mouse / touch / pen</code> are normalized; the gutter
      emits <code>resize-start</code> / <code>resizing</code> /
      <code>resize-end</code> with the current panel sizes as CSS px.
    </p>

    <section>
      <h2>Horizontal split</h2>
      <BsSplitter direction="horizontal" style="height: 240px; border: 1px solid var(--bs-border-color)">
        <div style="padding: 0.75rem">Left pane</div>
        <div style="padding: 0.75rem">Right pane</div>
      </BsSplitter>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
