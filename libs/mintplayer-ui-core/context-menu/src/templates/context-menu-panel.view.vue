<script setup lang="ts">
// The context menu's panel, rendered by the context-menu directive into a body host.
import type { CoreBag } from '@mintplayer/ui-core/component';

defineProps<{ root: CoreBag }>();
defineSlots<{
  /** The menu: usually a dropdown-menu. */
  default?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /></div>
</template>
