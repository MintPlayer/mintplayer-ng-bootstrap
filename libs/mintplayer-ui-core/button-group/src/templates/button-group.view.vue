<script setup lang="ts">
// Bootstrap's button group. The glue supplies `root` from buttonGroupCore.
import type { ButtonGroupProps } from '@mintplayer/ui-core/button-group';

defineProps<{ root: ButtonGroupProps['root'] }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /></div>
</template>
