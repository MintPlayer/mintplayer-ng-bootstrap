<script setup lang="ts">
// A contextual tab set (PRD #437 D10): its tabs, laid out as if the set were not there. The ribbon
// reads its label, colour and visibility through its content query.
import type { RibbonBag } from '@mintplayer/ui-core/ribbon';

defineProps<{ root: RibbonBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot></slot></div>
</template>
