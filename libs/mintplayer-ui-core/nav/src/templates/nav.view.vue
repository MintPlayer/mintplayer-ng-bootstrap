<script setup lang="ts">
// A Bootstrap .nav list. The glue supplies `root` from connectNav().
import type { NavProps } from '@mintplayer/ui-core/nav';

defineProps<{ root: NavProps['root'] }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <ul mp-host ref="root" v-bind="root"><slot /></ul>
</template>
