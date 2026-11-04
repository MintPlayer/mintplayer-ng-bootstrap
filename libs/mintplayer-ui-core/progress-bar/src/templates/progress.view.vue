<script setup lang="ts">
// The progress track: its bars are its content, or one indeterminate bar.
import type { ProgressView } from '@mintplayer/ui-core/progress-bar';

defineProps<{ view: ProgressView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.track" :style="view.trackStyle">
      <div v-if="view.indeterminate" v-bind="view.indeterminate"></div>
      <slot v-else />
    </div>
  </div>
</template>
