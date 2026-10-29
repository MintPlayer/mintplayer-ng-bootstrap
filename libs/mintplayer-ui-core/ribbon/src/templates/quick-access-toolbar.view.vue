<script setup lang="ts">
// The quick access toolbar (PRD #437 D10): a toolbar of its content, with roving focus.
import type { RibbonBag } from '@mintplayer/ui-core/ribbon';

defineProps<{ root: RibbonBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot></slot></div>
</template>
