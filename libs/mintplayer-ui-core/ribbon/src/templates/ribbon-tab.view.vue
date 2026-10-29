<script setup lang="ts">
// A ribbon tab's panel (PRD #437 D10). `view` comes from connectRibbonTab(). The overflow chevron
// and its menu show only in the Simplified layout, when groups do not fit.
import type { RibbonTabView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonTabView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.panel">
    <div v-bind="view.parts.groups"><slot></slot></div>
    <button v-bind="view.overflowTrigger"><span v-bind="view.parts.chevron">»</span></button>
    <div v-bind="view.overflowMenu">
      <button v-for="entry in view.overflowEntries" :key="entry.key" v-bind="entry.bag">
        <span v-if="entry.icon" v-bind="view.parts.overflowIcon">{{ entry.icon }}</span>
        <span v-bind="view.parts.overflowLabel">{{ entry.label }}</span>
      </button>
    </div>
  </div>
</template>
