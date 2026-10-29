<script setup lang="ts">
// Content of your own inside a ribbon group, sized like an item (PRD #437 D10).
import type { RibbonBag } from '@mintplayer/ui-core/ribbon';

defineProps<{ root: RibbonBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot></slot></div>
</template>
