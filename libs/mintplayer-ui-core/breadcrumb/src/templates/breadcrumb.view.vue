<script setup lang="ts">
// The breadcrumb: a named <nav> around the ordered list its items render into.
import type { BreadcrumbView } from '@mintplayer/ui-core/breadcrumb';

defineProps<{ view: BreadcrumbView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <nav mp-attrs v-bind="view.nav"><ol v-bind="view.list"><slot /></ol></nav>
  </div>
</template>
