<script setup lang="ts">
import type { CoreBag } from '@mintplayer/ui-core/component';

defineProps<{ root: CoreBag }>();
defineSlots<{
  /** The items, headers and dividers. */
  default?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /></div>
</template>
