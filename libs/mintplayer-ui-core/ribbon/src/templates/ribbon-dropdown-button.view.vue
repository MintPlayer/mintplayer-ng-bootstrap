<script setup lang="ts">
// A ribbon dropdown button (PRD #437 D10): opens the menu (its content).
import type { RibbonMenuButtonView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonMenuButtonView }>();
defineSlots<{ default?: () => unknown; iconTemplate?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <button v-bind="view.control">
      <span v-if="view.icon || $slots.iconTemplate" v-bind="view.parts.icon"><slot name="iconTemplate">{{ view.icon }}</slot></span>
      <span v-if="view.label" v-bind="view.parts.label">{{ view.label }}</span>
      <span v-bind="view.parts.chevron">▼</span>
    </button>
    <div v-bind="view.menu"><slot></slot></div>
  </div>
</template>
