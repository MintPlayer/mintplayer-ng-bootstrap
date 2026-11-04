<script setup lang="ts">
// bs-grid: Bootstrap's container around the consumer's rows. The glue supplies `root` from gridCore.
import type { CoreBag } from '@mintplayer/ui-core/component';

defineProps<{ root: CoreBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /></div>
</template>
