<script setup lang="ts">
// The radiogroup element: its radios are its descendants, in one node tree.
import type { CoreBag } from '@mintplayer/ui-core/component';

defineProps<{ root: CoreBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /></div>
</template>
