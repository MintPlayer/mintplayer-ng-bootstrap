<script setup lang="ts">
// The table: the consumer's rows inside a real <table>, in a (scrolling) host box.
import type { TableView } from '@mintplayer/ui-core/table';

defineProps<{ view: TableView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <table mp-attrs v-bind="view.table"><slot /></table>
  </div>
</template>
