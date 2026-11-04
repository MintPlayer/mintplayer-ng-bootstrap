<script setup lang="ts">
// The close button: the box is the host, the <button> takes the consumer's attributes.
import type { CloseView } from '@mintplayer/ui-core/close';

defineProps<{ view: CloseView }>();
</script>

<template>
  <span mp-host ref="root" v-bind="view.root"><button mp-attrs v-bind="view.button"></button></span>
</template>
