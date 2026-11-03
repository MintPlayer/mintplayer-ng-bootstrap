<script setup lang="ts">
// Bootstrap's input group: the root IS the .input-group, the content its direct children.
import type { InputGroupProps } from '@mintplayer/ui-core/input-group';

defineProps<{ root: InputGroupProps['root'] }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /></div>
</template>
