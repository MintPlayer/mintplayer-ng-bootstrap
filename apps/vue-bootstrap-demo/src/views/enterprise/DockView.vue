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

    <details class="mb-2">
      <summary>Keyboard shortcuts</summary>
      <ul class="mb-0">
        <li><kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> — move focus through tab strips, splitter dividers, intersection handles, and floating-pane close buttons</li>
        <li>On a tab strip: <kbd>←</kbd> / <kbd>→</kbd> move between tabs, <kbd>Home</kbd> / <kbd>End</kbd> jump to the first / last one, <kbd>Enter</kbd> / <kbd>Space</kbd> activate the focused tab</li>
        <li>On a splitter divider: <kbd>←</kbd> / <kbd>→</kbd> (or <kbd>↑</kbd> / <kbd>↓</kbd> for a vertical split) resize by 10% — <kbd>Shift</kbd> makes it 1% — and <kbd>Home</kbd> / <kbd>End</kbd> drive it to its limits</li>
        <li>On an intersection handle (the glyph where two splits cross): <kbd>←</kbd> / <kbd>→</kbd> drive the vertical divider and <kbd>↑</kbd> / <kbd>↓</kbd> the horizontal one; <kbd>Home</kbd> / <kbd>End</kbd> drive the vertical one; <kbd>Shift</kbd> is again the 1% fine step</li>
        <li>On a floating pane's edge or corner handle: arrows resize along that handle's axis (10px per step, <kbd>Shift</kbd> for 1px)</li>
        <li>Floating-pane close button — <kbd>Enter</kbd> / <kbd>Space</kbd> closes the window</li>
        <li><kbd>M</kbd> on a focused tab — arm pane move mode. Only the bare key arms it; <kbd>Ctrl</kbd>/<kbd>Alt</kbd>/<kbd>⌘</kbd> + <kbd>M</kbd> is left to the browser or the app.</li>
        <li>In move mode: <kbd>T</kbd> / <kbd>R</kbd> / <kbd>B</kbd> / <kbd>L</kbd> dock the pane to the top / right / bottom / left of the current stack · <kbd>F</kbd> tears it off into a floating window · <kbd>Esc</kbd> cancels</li>
        <li>Move mode stays armed while focus moves around inside the dock and cancels once focus leaves it; the commit always applies to the pane that was focused when <kbd>M</kbd> was pressed. Letters typed into an <code>input</code>, <code>textarea</code>, <code>select</code> or <code>contenteditable</code> inside a pane stay text and commit nothing.</li>
      </ul>
    </details>

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
