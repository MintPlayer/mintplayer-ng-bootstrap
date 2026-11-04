<script setup lang="ts">
// One breadcrumb step; in Angular and Lit the host is the item, so siblings get the separator.
import type { CoreBag } from '@mintplayer/ui-core/component';

defineProps<{ root: CoreBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <li mp-host ref="root" v-bind="root"><slot /></li>
</template>
