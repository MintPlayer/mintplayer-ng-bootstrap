<script setup lang="ts">
// The offcanvas: nothing where it is declared; the panel and its backdrop
// render into a body host while open (or sliding out).
import type { OffcanvasView } from '@mintplayer/ui-core/offcanvas';

defineProps<{ view: OffcanvasView }>();
defineSlots<{
  /** The panel's title; it names the panel. */
  header?: () => unknown;
  /** The panel's body. */
  default?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <template v-if="view.rendered">
      <teleport to="body">
        <div v-bind="view.panel" :style="view.panelStyle">
          <div v-if="$slots.header" v-bind="view.header">
            <h2 v-bind="view.title"><slot name="header" /></h2>
            <button v-if="view.close" v-bind="view.close"></button>
          </div>
          <div v-bind="view.body"><slot /></div>
        </div>
        <div v-if="view.backdrop" v-bind="view.backdrop"></div>
      </teleport>
    </template>
  </div>
</template>
