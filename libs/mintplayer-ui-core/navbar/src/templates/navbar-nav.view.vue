<script setup lang="ts">
// A .navbar-nav group. The glue supplies `bag` from connectNavbarNav().
import type { NavbarBag } from '@mintplayer/ui-core/navbar';

defineProps<{ bag: NavbarBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="bag"><slot /></div>
</template>
