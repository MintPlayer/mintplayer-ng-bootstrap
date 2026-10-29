<script setup lang="ts">
// One choice in a ribbon gallery (PRD #437 D10): an option.
import type { RibbonItemView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonItemView }>();
defineSlots<{ iconTemplate?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <button v-bind="view.control">
      <span v-bind="view.parts.galleryIcon"><slot name="iconTemplate">{{ view.icon || view.label }}</slot></span>
    </button>
  </div>
</template>
