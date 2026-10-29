<script setup lang="ts">
// One splitter panel (PRD #437 D10). `view` comes from connectSplitterPanel().
// The divider in front of the pane separates it from the previous panel; the
// first panel's is hidden.
import type { SplitterPanelView } from '@mintplayer/ui-core/splitter';

defineProps<{ view: SplitterPanelView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.divider"></div>
    <div v-bind="view.pane">
      <slot></slot>
    </div>
  </div>
</template>
