<script setup lang="ts">
// A ribbon command button (PRD #437 D10). `view` comes from connectRibbonButton().
import type { RibbonItemView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonItemView }>();
defineSlots<{ iconTemplate?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <button v-bind="view.control">
      <span v-if="view.icon || $slots.iconTemplate" v-bind="view.parts.icon"><slot name="iconTemplate">{{ view.icon }}</slot></span>
      <span v-if="view.label" v-bind="view.parts.label">{{ view.label }}</span>
    </button>
  </div>
</template>
