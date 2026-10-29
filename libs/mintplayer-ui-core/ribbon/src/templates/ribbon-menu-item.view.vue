<script setup lang="ts">
// A menu entry (PRD #437 D10): a menuitem, menuitemcheckbox or menuitemradio.
import type { RibbonMenuItemView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonMenuItemView }>();
defineSlots<{ iconTemplate?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <button v-bind="view.button">
      <span v-if="view.checkable" v-bind="view.parts.menuCheck">{{ view.check }}</span>
      <span v-bind="view.parts.menuIcon"><slot name="iconTemplate">{{ view.icon }}</slot></span>
      <span v-bind="view.parts.menuLabel">{{ view.label }}</span>
    </button>
  </div>
</template>
