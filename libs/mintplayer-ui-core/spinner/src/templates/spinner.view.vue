<script setup lang="ts">
// Bootstrap's spinner. The glue supplies `root` and `label` from spinnerCore.
import type { SpinnerProps } from '@mintplayer/ui-core/spinner';

defineProps<{ root: SpinnerProps['root']; label: SpinnerProps['label'] }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><span class="visually-hidden">{{ label }}</span></div>
</template>
