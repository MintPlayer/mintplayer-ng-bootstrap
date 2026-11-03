<script setup lang="ts">
// The hamburger toggle: a real button with three bars.
import type { NavbarTogglerView } from '@mintplayer/ui-core/navbar-toggler';

defineProps<{ view: NavbarTogglerView }>();
</script>

<template>
  <span mp-host ref="root" v-bind="view.root">
    <button mp-attrs v-bind="view.button"><span v-bind="view.line"></span><span v-bind="view.line"></span><span v-bind="view.line"></span></button>
  </span>
</template>
