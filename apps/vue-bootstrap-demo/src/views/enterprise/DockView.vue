<script setup lang="ts">
import { ref } from 'vue';
import { BsDockManager } from '@mintplayer/vue-bootstrap/dock';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { DockLayoutSnapshot } from '@mintplayer/web-components/dock';

const layout = ref<DockLayoutSnapshot>({
  root: {
    kind: 'split',
    direction: 'horizontal',
    sizes: [1, 2],
    children: [
      { kind: 'stack', panes: ['panel-1', 'panel-2'], activePane: 'panel-1' },
      { kind: 'stack', panes: ['panel-3'] },
    ],
  },
  floating: [],
  titles: {
    'panel-1': 'Panel 1',
    'panel-2': 'Panel 2',
    'panel-3': 'Panel 3',
  },
});

const SOURCE = `<BsDockManager v-model:layout="layout">
  <div slot="panel-1" class="p-3">…</div>
  <div slot="panel-2" class="p-3">…</div>
  <div slot="panel-3" class="p-3">…</div>
</BsDockManager>`;
</script>

<template>
  <div class="demo-page">
    <h1>Dock manager</h1>
    <p class="text-body-secondary">
      IDE-style dockable workspace built on splitters and tab stacks.
      Panes can be dragged between stacks, torn off into floating
      windows, and the arrangement is round-trippable as a JSON
      <code>DockLayoutSnapshot</code>.
    </p>

    <section style="height: 480px">
      <h2>Basic usage</h2>
      <BsDockManager
        v-model:layout="layout"
        style="display: block; height: 100%"
      >
        <div slot="panel-1" class="p-3"><h3>Panel 1</h3><p>Static content via a named slot.</p></div>
        <div slot="panel-2" class="p-3"><h3>Panel 2</h3><p>Drag this tab to dock it elsewhere.</p></div>
        <div slot="panel-3" class="p-3"><h3>Panel 3</h3><p>Press <kbd>M</kbd> on a focused tab to enter move mode.</p></div>
      </BsDockManager>
    </section>

    <section>
      <h2>Captured layout</h2>
      <BsCodeSnippet :code="JSON.stringify(layout, null, 2)" language="json" />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>
