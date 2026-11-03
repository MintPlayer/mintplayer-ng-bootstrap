<script setup lang="ts">
// The sparkline: the sized box (the root) around the role=img svg, which takes
// the consumer's attributes. `view` comes from connectSparkline().
import type { SparklineView } from '@mintplayer/ui-core/charts/sparkline';

defineProps<{ view: SparklineView }>();
</script>

<template>
  <span mp-host ref="root" v-bind="view.root">
    <svg mp-attrs v-bind="view.svg">
      <path v-if="view.fill" v-bind="view.fill"></path>
      <path v-if="view.line" v-bind="view.line"></path>
      <circle v-if="view.dot" v-bind="view.dot"></circle>
    </svg>
  </span>
</template>
