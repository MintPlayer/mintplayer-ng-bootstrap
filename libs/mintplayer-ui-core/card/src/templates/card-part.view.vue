<script setup lang="ts">
// A single-node card part (card, caps, body, title, texts, group): its root is the Bootstrap element.
import type { CardPartProps } from '@mintplayer/ui-core/card';

defineProps<{ root: CardPartProps['root'] }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /></div>
</template>
