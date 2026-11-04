<script setup lang="ts">
// The toaster: one toast slot per queue entry, in a fixed toast-container.
import type { ToastEntry, ToasterView } from '@mintplayer/ui-core/toast';

defineProps<{ view: ToasterView }>();
defineSlots<{
  /** One toast, given its queue entry. */
  toast?: (args: { toast: ToastEntry<unknown> }) => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <template v-for="t in view.toasts" :key="t.id">
      <slot name="toast" :toast="t"></slot>
    </template>
  </div>
</template>
