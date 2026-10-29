<script setup lang="ts">
// A ribbon group (PRD #437 D10). `view` comes from connectRibbonGroup(). When the reflow collapses
// the group, the core makes its body a popover and the trigger after it shows instead.
import type { RibbonGroupView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonGroupView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.body">
      <div v-bind="view.parts.groupItems"><slot></slot></div>
      <div v-bind="view.parts.groupFooter">
        <span v-bind="view.parts.groupLabel">{{ view.label }}</span>
        <button v-if="view.launcher" v-bind="view.launcher"><span v-bind="view.parts.launcherIcon">⬘</span></button>
      </div>
    </div>
    <button v-bind="view.trigger">
      <span v-if="view.icon" v-bind="view.parts.triggerIcon">{{ view.icon }}</span>
      <span v-bind="view.parts.triggerLabel">{{ view.label }}</span>
      <span v-bind="view.parts.chevron">▼</span>
    </button>
  </div>
</template>
