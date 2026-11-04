<script setup lang="ts">
// One .nav-item around a consumer link in a nav group (inside a dropdown the
// entries are bs-dropdown-items). The glue supplies `bag` from connectNavbarItem().
import type { NavbarBag } from '@mintplayer/ui-core/navbar';

defineProps<{ bag: NavbarBag }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="bag"><slot /></div>
</template>
