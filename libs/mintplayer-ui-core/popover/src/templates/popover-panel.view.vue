<script setup lang="ts">
// The popover's panel, rendered by the popover directive into a body host.
import type { PopoverPanelView } from '@mintplayer/ui-core/popover';

defineProps<{ view: PopoverPanelView }>();
defineSlots<{
  /** The popover's body. */
  default?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.arrow"></div>
    <h3 v-if="view.header" v-bind="view.header">{{ view.title }}</h3>
    <div v-bind="view.body"><slot /></div>
  </div>
</template>
