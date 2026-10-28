<script setup lang="ts">
import { connectNavbarNav } from '@mintplayer/ui-core/navbar';
import { computed } from 'vue';
import NavbarNavTemplate from './generated/navbar-nav.view.generated.vue';

/**
 * `BsNavbarNav` — one group of navbar entries (`.navbar-nav`). Holds
 * `BsNavbarItem`s and `BsNavbarDropdown`s; `align="end"` pushes the group to
 * the far edge of the bar.
 */
const props = defineProps<{
  align?: 'start' | 'end';
}>();

const bag = computed(() => connectNavbarNav(props.align ?? 'start'));
</script>

<template>
  <NavbarNavTemplate :bag="bag"><slot /></NavbarNavTemplate>
</template>
