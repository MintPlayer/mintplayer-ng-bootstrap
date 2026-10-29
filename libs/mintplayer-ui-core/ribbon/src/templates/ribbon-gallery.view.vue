<script setup lang="ts">
// A ribbon gallery (PRD #437 D10): a listbox grid of its gallery items.
import type { RibbonItemView, RibbonStyle } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonItemView; columns: RibbonStyle }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.control" :style="columns"><slot></slot></div>
  </div>
</template>
