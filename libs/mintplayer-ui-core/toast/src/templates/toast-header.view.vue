<script setup lang="ts">
// The header: the consumer's content, then the close button when dismissible.
import type { CoreBag } from '@mintplayer/ui-core/component';

defineProps<{ root: CoreBag; close: CoreBag | null }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"><slot /><button v-if="close" v-bind="close"></button></div>
</template>
