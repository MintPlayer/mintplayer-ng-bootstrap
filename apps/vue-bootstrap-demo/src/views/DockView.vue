<script setup lang="ts">
import { BsDockManager } from '@mintplayer/vue-bootstrap/dock';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<script setup lang="ts">
import { BsDockManager } from '@mintplayer/vue-bootstrap/dock';
<\/script>

<template>
  <BsDockManager style="height: 500px">
    <div slot="paneA">Pane A content</div>
    <div slot="paneB">Pane B content</div>
  </BsDockManager>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Dock manager</h1>
    <p class="text-body-secondary">
      Draggable, dockable panes with tab strips, splitters, and float-out
      windows. Drag a pane tab onto another tab strip to dock; drag onto an
      edge to split.
    </p>
    <section>
      <h2>Two-pane dock</h2>
      <div style="height: 500px;">
        <BsDockManager>
          <div slot="paneA">
            <h5>Pane A</h5>
            <p>This is some content in the first pane. Try dragging the tab strip header to dock it elsewhere.</p>
          </div>
          <div slot="paneB">
            <h5>Pane B</h5>
            <p>And this is the second pane. Drag a pane onto another to merge them into a tab group.</p>
          </div>
        </BsDockManager>
      </div>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
