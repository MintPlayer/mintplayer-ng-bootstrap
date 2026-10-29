<script setup lang="ts">
// One node of the dock's layout tree, and its children through itself: a
// recursive partial of dock.view.vue. A split composes a splitter; a stack is
// a tablist over one panel, rendered empty: the core seats the active pane's
// host in it, so the pane's content survives every relayout.
import type { DockNodeView } from '@mintplayer/ui-core/dock';

defineProps<{ node: DockNodeView }>();
</script>

<template>
  <div v-bind="node.bag">
    <mp-splitter
      v-if="node.split"
      :orientation="node.direction"
      :minPanelSize="48"
      @resizeEnd="node.onResizeEnd"
      @resizing="node.onResizing"
    >
      <mp-splitter-panel v-for="c in node.children" :key="c.key">
        <DockNode :node="c.node" />
      </mp-splitter-panel>
    </mp-splitter>
    <template v-if="node.stack">
      <div v-bind="node.stack.strip">
        <template v-for="t in node.stack.tabs" :key="t.key">
          <span v-if="t.placeholder" v-bind="t.bag" :style="t.style">{{ t.title }}</span>
          <button v-else v-bind="t.bag">{{ t.title }}</button>
        </template>
      </div>
      <div v-bind="node.stack.body">{{ node.stack.empty }}</div>
    </template>
  </div>
</template>
