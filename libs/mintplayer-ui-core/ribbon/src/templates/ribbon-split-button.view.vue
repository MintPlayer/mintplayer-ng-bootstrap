<script setup lang="ts">
// A ribbon split button (PRD #437 D10): the main command, and a chevron opening the menu (its content).
import type { RibbonSplitButtonView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonSplitButtonView }>();
defineSlots<{ default?: () => unknown; iconTemplate?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.group">
      <button v-bind="view.control">
        <span v-if="view.icon || $slots.iconTemplate" v-bind="view.parts.icon"><slot name="iconTemplate">{{ view.icon }}</slot></span>
        <span v-if="view.label" v-bind="view.parts.label">{{ view.label }}</span>
      </button>
      <button v-bind="view.toggle"><span v-bind="view.parts.chevron">▼</span></button>
    </div>
    <div v-bind="view.menu"><slot></slot></div>
  </div>
</template>
