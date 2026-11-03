<script setup lang="ts">
// The loading region: the content, then the status node that says when loading ends.
import type { PlaceholderView } from '@mintplayer/ui-core/placeholder';

defineProps<{ view: PlaceholderView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root"><slot /><span v-bind="view.status">{{ view.message }}</span></div>
</template>
