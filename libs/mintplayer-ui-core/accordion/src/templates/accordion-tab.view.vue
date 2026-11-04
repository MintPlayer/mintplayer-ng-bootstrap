<script setup lang="ts">
// One tab: a native <details> whose summary is the header and whose region is the body.
import type { AccordionTabView } from '@mintplayer/ui-core/accordion';

defineProps<{ view: AccordionTabView }>();
defineSlots<{ header?: () => unknown; default?: () => unknown }>();
</script>

<template>
  <details ref="root" v-bind="view.item">
    <summary mp-attrs v-bind="view.summary"><slot name="header" /></summary>
    <div v-bind="view.content"><slot /></div>
  </details>
</template>
