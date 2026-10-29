<script setup lang="ts">
// One entry around a consumer link: a .nav-item in a nav group, a
// .dropdown-item in a dropdown panel. The glue supplies `bag` from connectNavbarItem().
import type { NavbarBag } from '@mintplayer/ui-core/navbar';

defineProps<{ bag: NavbarBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="bag"><slot /></div>
</template>
