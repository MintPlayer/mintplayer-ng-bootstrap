<script setup lang="ts">
import { BsSplitter } from '@mintplayer/vue-bootstrap/splitter';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<BsSplitter orientation="horizontal" style="height: 240px">
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

    <details class="mb-2">
      <summary>Keyboard shortcuts</summary>
      <ul class="mb-0">
        <li><kbd>Tab</kbd> — focus the next divider (each one is a <code>role="separator"</code> tab stop reporting its position as <code>aria-valuenow</code>)</li>
        <li><kbd>←</kbd> / <kbd>→</kbd> — resize a horizontal splitter by 10% (<kbd>Shift</kbd>: 1%)</li>
        <li><kbd>↑</kbd> / <kbd>↓</kbd> — resize a vertical splitter by 10% (<kbd>Shift</kbd>: 1%)</li>
        <li>Arrows across the splitter's other axis are ignored</li>
        <li><kbd>Home</kbd> — shrink the leading panel to its minimum size</li>
        <li><kbd>End</kbd> — grow the leading panel until the trailing one hits its minimum</li>
      </ul>
    </details>

    <section>
      <h2>Horizontal split</h2>
      <BsSplitter orientation="horizontal" style="height: 240px; border: 1px solid var(--bs-border-color)">
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
