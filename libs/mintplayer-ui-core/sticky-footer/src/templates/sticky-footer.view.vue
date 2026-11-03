<script setup lang="ts">
// The sticky footer: a flex item that takes the free space above it, around a real <footer>.
import type { StickyFooterView } from '@mintplayer/ui-core/sticky-footer';

defineProps<{ view: StickyFooterView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root"><footer mp-attrs v-bind="view.footer"><slot /></footer></div>
</template>
