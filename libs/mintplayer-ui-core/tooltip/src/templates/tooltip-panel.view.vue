<script setup lang="ts">
// The tooltip's panel, rendered by the tooltip directive into a body host.
import type { TooltipPanelView } from '@mintplayer/ui-core/tooltip';

defineProps<{ view: TooltipPanelView }>();
defineSlots<{
  /** The tooltip's text. */
  default?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.arrow"></div>
    <div v-bind="view.inner"><slot /></div>
  </div>
</template>
