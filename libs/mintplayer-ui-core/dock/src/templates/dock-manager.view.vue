<script setup lang="ts">
// The dock manager's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectDock(). The docked tree and
// every floating window render through the DockNode partial; each pane's
// content is teleported into the host element the core made for it, and the
// core seats that host in the panel of the stack showing the pane.
import type { DockView } from '@mintplayer/ui-core/dock';
import DockNode from './dock-node.view.vue';

defineProps<{ view: DockView }>();
defineSlots<{
  /** One pane's content, by the pane name the layout uses. */
  pane?: (args: { pane: string }) => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.docked">
      <DockNode v-if="view.dockedNode" :node="view.dockedNode" />
    </div>
    <div v-bind="view.floatingLayer">
      <div v-for="f in view.floating" :key="f.key" v-bind="f.bag" :style="f.style">
        <div v-bind="f.chrome">
          <div v-bind="f.title">{{ f.titleText }}</div>
          <button v-bind="f.close">×</button>
        </div>
        <div v-bind="f.content">
          <DockNode v-if="f.node" :node="f.node" />
        </div>
        <div v-for="r in f.resizers" :key="r.key" v-bind="r.bag"></div>
      </div>
    </div>
    <div v-bind="view.intersectionLayer">
      <div v-for="h in view.intersections" :key="h.key" v-bind="h.bag" :style="h.style"></div>
    </div>
    <div v-bind="view.indicator" :style="view.indicatorStyle"></div>
    <div v-bind="view.joystick" :style="view.joystickStyle">
      <template v-for="c in view.joystickCells" :key="c.key">
        <button v-if="c.button" v-bind="c.bag">{{ c.glyph }}</button>
        <span v-else v-bind="c.bag"></span>
      </template>
    </div>
    <div v-bind="view.live">{{ view.announcement }}</div>
    <div v-bind="view.parking"></div>
    <template v-for="p in view.panes" :key="p.name">
      <teleport :to="p.host">
        <slot name="pane" :pane="p.name"></slot>
      </teleport>
    </template>
  </div>
</template>
