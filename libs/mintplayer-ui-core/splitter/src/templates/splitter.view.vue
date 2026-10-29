<script setup lang="ts">
// The splitter's markup, compiled into the Angular, React, Vue and Lit fronts
// (PRD #437 D10). `view` comes from connectSplitter(); the panels render
// their own dividers.
import type { SplitterView } from '@mintplayer/ui-core/splitter';

defineProps<{ view: SplitterView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <slot></slot>
  </div>
</template>
