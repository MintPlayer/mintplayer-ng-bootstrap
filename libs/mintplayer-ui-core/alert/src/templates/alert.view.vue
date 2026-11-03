<script setup lang="ts">
// The alert: the consumer's content, then the close button when dismissible.
import type { AlertView } from '@mintplayer/ui-core/alert';

defineProps<{ view: AlertView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root"><slot /><button v-if="view.dismiss" v-bind="view.dismiss"></button></div>
</template>
