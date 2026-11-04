<script setup lang="ts">
// Bootstrap's badge. The glue supplies `root` and `unit` from badgeCore.
import type { BadgeProps } from '@mintplayer/ui-core/badge';

defineProps<{ root: BadgeProps['root']; unit: BadgeProps['unit'] }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <span mp-host ref="root" v-bind="root"><slot /><span v-if="unit" class="visually-hidden">{{ unit }}</span></span>
</template>
