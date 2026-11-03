<script setup lang="ts">
// One bar; its content is an optional visible label.
import type { ProgressBarView } from '@mintplayer/ui-core/progress-bar';

defineProps<{ view: ProgressBarView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-attrs ref="root" v-bind="view.bar"><slot /></div>
</template>
