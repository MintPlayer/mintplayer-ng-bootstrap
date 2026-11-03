<script setup lang="ts">
// One .nav-item around a consumer link; each front marks the link a .nav-link.
import type { NavProps } from '@mintplayer/ui-core/nav';

defineProps<{ root: NavProps['root'] }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <li mp-host ref="root" v-bind="root"><slot /></li>
</template>
