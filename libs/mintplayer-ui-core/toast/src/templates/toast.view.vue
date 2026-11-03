<script setup lang="ts">
// The toast: the consumer's header and body.
import type { CoreBag } from '@mintplayer/ui-core/component';

defineProps<{ root: CoreBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /></div>
</template>
